import Sale from "../models/sale.model.js";
import mongoose from "mongoose";
import { buildDateFilter } from "../utils/date-filter.js";
import { createExcelBuffer } from "../utils/excel.util.js";
import { createInvoiceFromSale } from "./invoice.service.js";
import Counter from "../models/counter.model.js";

const generateSaleNumber = async (session = null) => {
  const options = {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  };

  if (session) {
    options.session = session;
  }

  const counter = await Counter.findOneAndUpdate(
    { _id: "saleNumber" },
    { $inc: { seq: 1 } },
    options,
  );

  return `SAL-${String(counter.seq).padStart(5, "0")}`;
};

export const createSaleFromOrder = async (order, session = null) => {
  if (!order) {
    throw new Error("Order is required.");
  }

  let saleQuery = Sale.findOne({
    order: order._id,
  });

  if (session) {
    saleQuery = saleQuery.session(session);
  }

  let sale = await saleQuery;

  if (!sale) {
    const saleNumber = await generateSaleNumber(session);

    const saleData = {
      saleNumber,
      order: order._id,
      customer: order.customer,
      items: order.items,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: "PAID",
      soldAt: new Date(),
    };

    if (session) {
      const [createdSale] = await Sale.create([saleData], {
        session,
      });

      sale = createdSale;
    } else {
      sale = await Sale.create(saleData);
    }
  }

  const invoice = await createInvoiceFromSale(sale._id, session);

  return {
    sale,
    invoice,
  };
};

export const getSalesService = async ({
  page = 1,
  limit = 10,
  period,
  startDate,
  endDate,
  customer,
  paymentMethod,
}) => {
  page = Number(page);
  limit = Number(limit);

  const filter = {};

  // Customer filter
  if (customer) {
    if (!mongoose.Types.ObjectId.isValid(customer)) {
      throw new Error("Invalid customer ID.");
    }

    filter.customer = customer;
  }

  // Payment method filter
  if (paymentMethod) {
    filter.paymentMethod = paymentMethod;
  }

  // Date filter
  const now = new Date();

  if (period) {
    let fromDate = new Date();

    switch (period) {
      case "today":
        fromDate.setHours(0, 0, 0, 0);
        break;

      case "week": {
        const day = fromDate.getDay();
        const diff = day === 0 ? 6 : day - 1;

        fromDate.setDate(fromDate.getDate() - diff);
        fromDate.setHours(0, 0, 0, 0);
        break;
      }

      case "month":
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case "year":
        fromDate = new Date(now.getFullYear(), 0, 1);
        break;

      default:
        throw new Error("Invalid period.");
    }

    filter.soldAt = {
      $gte: fromDate,
      $lte: now,
    };
  }

  // Custom date range
  if (startDate && endDate) {
    filter.soldAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const total = await Sale.countDocuments(filter);

  const sales = await Sale.find(filter)
    .populate("customer", "fullName email phoneNumber")
    .populate("order", "orderNumber")
    .sort({ soldAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    sales,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

export const getSaleByIdService = async (saleId) => {
  if (!mongoose.Types.ObjectId.isValid(saleId)) {
    throw new Error("Invalid sale ID.");
  }

  const sale = await Sale.findById(saleId)
    .populate("customer", "fullName email phoneNumber")
    .populate("order", "orderNumber status paymentMethod paymentStatus")
    .populate("items.product", "name sku category price");

  if (!sale) {
    throw new Error("Sale not found.");
  }

  return sale;
};

export const getSalesSummaryService = async ({
  period,
  startDate,
  endDate,
}) => {
  const dateFilter = buildDateFilter({
    period,
    startDate,
    endDate,
  });

  const matchStage = Object.keys(dateFilter).length
    ? { $match: dateFilter }
    : null;

  const pipeline = [];

  if (matchStage) {
    pipeline.push(matchStage);
  }

  pipeline.push({
    $group: {
      _id: null,
      totalRevenue: {
        $sum: "$total",
      },
      totalDiscount: {
        $sum: "$discount",
      },
      totalSales: {
        $sum: 1,
      },
    },
  });

  const summary = await Sale.aggregate(pipeline);

  return {
    totalRevenue: summary[0]?.totalRevenue || 0,

    totalDiscount: summary[0]?.totalDiscount || 0,

    totalSales: summary[0]?.totalSales || 0,
  };
};

export const getRevenueService = async ({ period, startDate, endDate }) => {
  const dateFilter = buildDateFilter({
    period,
    startDate,
    endDate,
  });

  const pipeline = [];

  if (Object.keys(dateFilter).length > 0) {
    pipeline.push({
      $match: dateFilter,
    });
  }

  pipeline.push({
    $group: {
      _id: null,

      revenue: {
        $sum: "$total",
      },

      discount: {
        $sum: "$discount",
      },

      sales: {
        $sum: 1,
      },
    },
  });

  const result = await Sale.aggregate(pipeline);

  return {
    revenue: result[0]?.revenue || 0,
    discount: result[0]?.discount || 0,
    sales: result[0]?.sales || 0,
  };
};

export const getSoldProductsService = async ({
  page = 1,
  limit = 10,
  period,
  startDate,
  endDate,
}) => {
  page = Number(page);
  limit = Number(limit);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Page must be a positive integer.");
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Limit must be a positive integer.");
  }

  const dateFilter = buildDateFilter({
    period,
    startDate,
    endDate,
  });

  const matchStage = Object.keys(dateFilter).length
    ? {
        $match: dateFilter,
      }
    : null;

  const pipeline = [];

  // Filter sales by date
  if (matchStage) {
    pipeline.push(matchStage);
  }

  // Break each sale into individual products
  pipeline.push({
    $unwind: "$items",
  });

  // Group products
  pipeline.push({
    $group: {
      _id: "$items.product",

      productName: {
        $first: "$items.productName",
      },

      sku: {
        $first: "$items.sku",
      },

      quantitySold: {
        $sum: "$items.quantity",
      },

      revenue: {
        $sum: "$items.subtotal",
      },

      salesCount: {
        $sum: 1,
      },
    },
  });

  // Sort by highest quantity sold
  pipeline.push({
    $sort: {
      quantitySold: -1,
    },
  });

  // Get total number of different products
  const countPipeline = [...pipeline];

  countPipeline.push({
    $count: "total",
  });

  const countResult = await Sale.aggregate(countPipeline);

  const total = countResult[0]?.total || 0;

  // Pagination
  pipeline.push({
    $skip: (page - 1) * limit,
  });

  pipeline.push({
    $limit: limit,
  });

  const products = await Sale.aggregate(pipeline);

  return {
    products,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

export const getCategorySalesService = async ({
  page = 1,
  limit = 10,
  period,
  startDate,
  endDate,
}) => {
  page = Number(page);
  limit = Number(limit);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Page must be a positive integer.");
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Limit must be a positive integer.");
  }

  const dateFilter = buildDateFilter({
    period,
    startDate,
    endDate,
  });

  const pipeline = [];

  // 1. Filter sales by date
  if (Object.keys(dateFilter).length > 0) {
    pipeline.push({
      $match: dateFilter,
    });
  }

  // 2. Get individual sale items
  pipeline.push({
    $unwind: "$items",
  });

  // 3. Get product information
  pipeline.push({
    $lookup: {
      from: "products",
      localField: "items.product",
      foreignField: "_id",
      as: "product",
    },
  });

  // 4. Convert product array to object
  pipeline.push({
    $unwind: "$product",
  });

  // 5. Get category information
  pipeline.push({
    $lookup: {
      from: "categories",
      localField: "product.category",
      foreignField: "_id",
      as: "category",
    },
  });

  // 6. Convert category array to object
  pipeline.push({
    $unwind: "$category",
  });

  // 7. Group sales by category
  pipeline.push({
    $group: {
      _id: "$category._id",

      categoryName: {
        $first: "$category.name",
      },

      quantitySold: {
        $sum: "$items.quantity",
      },

      revenue: {
        $sum: "$items.subtotal",
      },

      salesCount: {
        $sum: 1,
      },
    },
  });

  // 8. Sort by highest revenue
  pipeline.push({
    $sort: {
      revenue: -1,
    },
  });

  // 9. Count total categories
  const countPipeline = [...pipeline];

  countPipeline.push({
    $count: "total",
  });

  const countResult = await Sale.aggregate(countPipeline);

  const total = countResult[0]?.total || 0;

  // 10. Pagination
  pipeline.push({
    $skip: (page - 1) * limit,
  });

  pipeline.push({
    $limit: limit,
  });

  const categories = await Sale.aggregate(pipeline);

  return {
    categories,

    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

export const exportSalesService = async ({
  period,
  startDate,
  endDate,
  customer,
  paymentMethod,
}) => {
  const filter = {};

  // Customer filter
  if (customer) {
    if (!mongoose.Types.ObjectId.isValid(customer)) {
      throw new Error("Invalid customer ID.");
    }

    filter.customer = customer;
  }

  // Payment method filter
  if (paymentMethod) {
    filter.paymentMethod = paymentMethod;
  }

  // Date filter
  const dateFilter = buildDateFilter({
    period,
    startDate,
    endDate,
  });

  if (Object.keys(dateFilter).length > 0) {
    Object.assign(filter, dateFilter);
  }

  const sales = await Sale.find(filter)
    .populate("customer", "fullName email phoneNumber")
    .populate("order", "orderNumber")
    .sort({ soldAt: -1 })
    .lean();

  const rows = [];

  for (const sale of sales) {
    for (const item of sale.items) {
      rows.push({
        saleNumber: sale.saleNumber,
        saleDate: sale.soldAt,

        orderNumber: sale.order?.orderNumber || "",

        customerName: sale.customer?.fullName || "",
        customerEmail: sale.customer?.email || "",
        customerPhone: sale.customer?.phoneNumber || "",

        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus,

        productName: item.productName,
        sku: item.sku,

        quantity: item.quantity,
        price: item.price,
        itemSubtotal: item.subtotal,

        saleSubtotal: sale.subtotal,
        discount: sale.discount,
        saleTotal: sale.total,
      });
    }
  }

  const buffer = createExcelBuffer({
    workbookName: "sales-export",
    sheets: [
      {
        name: "Sales",
        data: rows,
      },
    ],
  });

  return {
    buffer,
    count: sales.length,
  };
};
