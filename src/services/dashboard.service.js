import Sale from "../models/sale.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";
import { buildDateFilter } from "../utils/date-filter.js";
import StockMovement from "../models/stock-movement.model.js";
import { getCache, setCache } from "./cache.service.js";
import { buildDashboardCacheKey } from "../utils/dashboard-cache-key.js";

export const getDashboardOverviewService = async ({
  period,
  startDate,
  endDate,
}) => {
  const cacheKey = buildDashboardCacheKey("overview", {
    period,
    startDate,
    endDate,
  });

  // Check Redis
  const cachedData = await getCache(cacheKey);

  if (cachedData !== null) {
    console.log(`Dashboard overview cache HIT: ${cacheKey}`);

    return cachedData;
  }

  console.log(`Dashboard overview cache MISS: ${cacheKey}`);

  //date filter
  const dateFilter = buildDateFilter({
    period,
    startDate,
    endDate,
  });

  //sales overview
  const salesPipeline = [];

  if (Object.keys(dateFilter).length > 0) {
    salesPipeline.push({
      $match: dateFilter,
    });
  }

  salesPipeline.push({
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

  const salesResult = await Sale.aggregate(salesPipeline);

  const revenue = salesResult[0]?.revenue || 0;
  const discount = salesResult[0]?.discount || 0;
  const sales = salesResult[0]?.sales || 0;
  //orders
  const orderFilter = {};

  if (Object.keys(dateFilter).length > 0) {
    const orderDateFilter = {};

    if (dateFilter.soldAt) {
      orderDateFilter.createdAt = dateFilter.soldAt;
    }

    Object.assign(orderFilter, orderDateFilter);
  }

  const orders = await Order.countDocuments(orderFilter);
  //customers
  const customers = await User.countDocuments({
    role: "CUSTOMER",
    isActive: true,
  });
  //products
  const products = await Product.countDocuments({
    isActive: true,
  });

  // low stock/ out of stock
  const normalProducts = await Product.find({
    isActive: true,
    hasVariants: false,
  }).select("stock");

  // Variants
  const variants = await ProductVariant.find({
    isActive: true,
  }).select("stock");

  let lowStock = 0;
  let outOfStock = 0;

  // Products without variants
  for (const product of normalProducts) {
    const stock = product.stock ?? 0;

    if (stock === 0) {
      outOfStock++;
    } else if (stock <= 10) {
      lowStock++;
    }
  }

  // Products with variants
  for (const variant of variants) {
    const stock = variant.stock ?? 0;

    if (stock === 0) {
      outOfStock++;
    } else if (stock <= 10) {
      lowStock++;
    }
  }

  const data = {
    revenue,
    discount,
    sales,
    orders,
    customers,
    products,
    lowStock,
    outOfStock,
  };

  await setCache(cacheKey, data, 60);

  return data;
};

export const getRevenueChartService = async ({
  period,
  startDate,
  endDate,
}) => {
  const cacheKey = buildDashboardCacheKey("revenue-chart", {
    period,
    startDate,
    endDate,
  });

  const cachedData = await getCache(cacheKey);

  if (cachedData !== null) {
    console.log(`Revenue chart cache HIT: ${cacheKey}`);

    return cachedData;
  }

  console.log(`Revenue chart cache MISS: ${cacheKey}`);
  const dateFilter = buildDateFilter({
    period,
    startDate,
    endDate,
  });

  let groupId;

  //group
  switch (period) {
    case "today":
      groupId = {
        year: { $year: "$soldAt" },
        month: { $month: "$soldAt" },
        day: { $dayOfMonth: "$soldAt" },
        hour: { $hour: "$soldAt" },
      };
      break;

    case "week":
    case "month":
      groupId = {
        year: { $year: "$soldAt" },
        month: { $month: "$soldAt" },
        day: { $dayOfMonth: "$soldAt" },
      };
      break;

    case "year":
      groupId = {
        year: { $year: "$soldAt" },
        month: { $month: "$soldAt" },
      };
      break;

    default:
      // Custom date range
      groupId = {
        year: { $year: "$soldAt" },
        month: { $month: "$soldAt" },
        day: { $dayOfMonth: "$soldAt" },
      };
  }

  //pipeline
  const pipeline = [];

  if (Object.keys(dateFilter).length > 0) {
    pipeline.push({
      $match: dateFilter,
    });
  }

  pipeline.push({
    $group: {
      _id: groupId,

      revenue: {
        $sum: "$total",
      },

      sales: {
        $sum: 1,
      },
    },
  });

  pipeline.push({
    $sort: {
      "_id.year": 1,
      "_id.month": 1,
      "_id.day": 1,
      "_id.hour": 1,
    },
  });

  const result = await Sale.aggregate(pipeline);

  //format response
  const data = result.map((item) => {
    const { year, month, day, hour } = item._id;

    let label;

    if (period === "today") {
      label = `${String(hour).padStart(2, "0")}:00`;
    } else if (period === "year") {
      label = `${year}-${String(month).padStart(2, "0")}`;
    } else {
      label = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }

    return {
      label,
      revenue: item.revenue,
      sales: item.sales,
    };
  });

  await setCache(cacheKey, data, 60);

  return data;
};

export const getOrderStatisticsService = async ({
  period,
  startDate,
  endDate,
}) => {
  const cacheKey = buildDashboardCacheKey("orders", {
    period,
    startDate,
    endDate,
  });

  const cachedData = await getCache(cacheKey);

  if (cachedData !== null) {
    console.log(`Order statistics cache HIT: ${cacheKey}`);

    return cachedData;
  }

  console.log(`Order statistics cache MISS: ${cacheKey}`);

  const dateFilter = buildDateFilter({
    period,
    startDate,
    endDate,
  });

  const pipeline = [];

  // DATE FILTER
  if (Object.keys(dateFilter).length > 0) {
    const orderDateFilter = {};

    // buildDateFilter returns a filter for soldAt.
    // Orders use createdAt.
    if (dateFilter.soldAt) {
      orderDateFilter.createdAt = dateFilter.soldAt;
    }

    pipeline.push({
      $match: orderDateFilter,
    });
  }

  //group orders by status
  pipeline.push({
    $group: {
      _id: "$status",
      count: {
        $sum: 1,
      },
    },
  });

  const result = await Order.aggregate(pipeline);

  // default counts
  const statistics = {
    total: 0,
    pending: 0,
    confirmed: 0,
    processing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const item of result) {
    const count = item.count;

    statistics.total += count;

    switch (item._id) {
      case "PENDING":
        statistics.pending = count;
        break;

      case "CONFIRMED":
        statistics.confirmed = count;
        break;

      case "PROCESSING":
        statistics.processing = count;
        break;

      case "READY":
        statistics.ready = count;
        break;

      case "COMPLETED":
        statistics.completed = count;
        break;

      case "CANCELLED":
        statistics.cancelled = count;
        break;
    }
  }

  await setCache(cacheKey, statistics, 30);

  return statistics;
};

export const getPaymentStatisticsService = async ({
  period,
  startDate,
  endDate,
}) => {
  const cacheKey = buildDashboardCacheKey("payments", {
    period,
    startDate,
    endDate,
  });

  const cachedData = await getCache(cacheKey);

  if (cachedData !== null) {
    console.log(`Payment statistics cache HIT: ${cacheKey}`);

    return cachedData;
  }

  console.log(`Payment statistics cache MISS: ${cacheKey}`);

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
  //group by payment method
  pipeline.push({
    $group: {
      _id: "$paymentMethod",

      sales: {
        $sum: 1,
      },

      revenue: {
        $sum: "$total",
      },
    },
  });

  const result = await Sale.aggregate(pipeline);

  const methods = {
    CASH: {
      sales: 0,
      revenue: 0,
    },

    CARD: {
      sales: 0,
      revenue: 0,
    },

    ONLINE: {
      sales: 0,
      revenue: 0,
    },
  };

  for (const item of result) {
    if (methods[item._id]) {
      methods[item._id].sales = item.sales;
      methods[item._id].revenue = item.revenue;
    }
  }

  const totalSales =
    methods.CASH.sales + methods.CARD.sales + methods.ONLINE.sales;

  const totalRevenue =
    methods.CASH.revenue + methods.CARD.revenue + methods.ONLINE.revenue;

  const data = {
    total: {
      sales: totalSales,
      revenue: totalRevenue,
    },

    methods: [
      {
        paymentMethod: "CASH",
        sales: methods.CASH.sales,
        revenue: methods.CASH.revenue,
      },

      {
        paymentMethod: "CARD",
        sales: methods.CARD.sales,
        revenue: methods.CARD.revenue,
      },

      {
        paymentMethod: "ONLINE",
        sales: methods.ONLINE.sales,
        revenue: methods.ONLINE.revenue,
      },
    ],
  };

  await setCache(cacheKey, data, 60);

  return data;
};

export const getTopProductsService = async ({
  period,
  startDate,
  endDate,
  limit = 5,
}) => {
  limit = Number(limit);

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Limit must be a positive integer.");
  }

  const cacheKey = buildDashboardCacheKey("top-products", {
    period,
    startDate,
    endDate,
    limit,
  });

  const cachedData = await getCache(cacheKey);

  if (cachedData !== null) {
    console.log(`Top products cache HIT: ${cacheKey}`);

    return cachedData;
  }

  console.log(`Top products cache MISS: ${cacheKey}`);

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

  // break sale into individual items
  pipeline.push({
    $unwind: "$items",
  });

  // group by product
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

  // sort by quantity
  pipeline.push({
    $sort: {
      quantitySold: -1,
    },
  });

  // limit top products
  pipeline.push({
    $limit: limit,
  });

  const products = await Sale.aggregate(pipeline);

  const data = products.map((product, index) => ({
    rank: index + 1,
    productId: product._id,
    productName: product.productName,
    sku: product.sku,
    quantitySold: product.quantitySold,
    revenue: product.revenue,
    salesCount: product.salesCount,
  }));

  await setCache(cacheKey, data, 300);

  return data;
};

export const getCategorySalesStatisticsService = async ({
  period,
  startDate,
  endDate,
}) => {
  const cacheKey = buildDashboardCacheKey("categories", {
    period,
    startDate,
    endDate,
  });

  const cachedData = await getCache(cacheKey);

  if (cachedData !== null) {
    console.log(`Category statistics cache HIT: ${cacheKey}`);

    return cachedData;
  }

  console.log(`Category statistics cache MISS: ${cacheKey}`);

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
    $unwind: "$items",
  });

  pipeline.push({
    $lookup: {
      from: "products",
      localField: "items.product",
      foreignField: "_id",
      as: "product",
    },
  });

  pipeline.push({
    $unwind: "$product",
  });

  pipeline.push({
    $lookup: {
      from: "categories",
      localField: "product.category",
      foreignField: "_id",
      as: "category",
    },
  });

  pipeline.push({
    $unwind: "$category",
  });

  //group by category
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

  pipeline.push({
    $sort: {
      revenue: -1,
    },
  });

  const categories = await Sale.aggregate(pipeline);

  //totoal revenue
  const totalRevenue = categories.reduce(
    (total, category) => total + category.revenue,
    0,
  );

  //add revenue percentage
  const data = categories.map((category) => ({
    categoryId: category._id,
    categoryName: category.categoryName,
    quantitySold: category.quantitySold,
    revenue: category.revenue,
    salesCount: category.salesCount,

    revenuePercentage:
      totalRevenue > 0
        ? Number(((category.revenue / totalRevenue) * 100).toFixed(2))
        : 0,
  }));

  await setCache(cacheKey, data, 300);

  return data;
};

export const getInventoryStatisticsService = async () => {
  const cacheKey = "dashboard:inventory";

  const cachedData = await getCache(cacheKey);

  if (cachedData !== null) {
    console.log(`Inventory cache HIT: ${cacheKey}`);

    return cachedData;
  }

  console.log(`Inventory cache MISS: ${cacheKey}`);

  const products = await Product.find({
    isActive: true,
  })
    .populate("category", "name")
    .lean();

  const variants = await ProductVariant.find({
    isActive: true,
  }).lean();
  //group variants by products
  const variantsByProduct = new Map();

  for (const variant of variants) {
    const productId = variant.product.toString();

    if (!variantsByProduct.has(productId)) {
      variantsByProduct.set(productId, []);
    }

    variantsByProduct.get(productId).push(variant);
  }

  let totalProducts = 0;
  let productsInStock = 0;
  let lowStockProducts = 0;
  let outOfStockProducts = 0;

  let totalInventoryUnits = 0;
  let totalInventoryValue = 0;

  const lowStock = [];
  const outOfStock = [];

  for (const product of products) {
    totalProducts++;

    if (product.hasVariants) {
      const productVariants =
        variantsByProduct.get(product._id.toString()) || [];

      const totalStock = productVariants.reduce(
        (sum, variant) => sum + (variant.stock || 0),
        0,
      );

      const inventoryValue = productVariants.reduce(
        (sum, variant) => sum + (variant.stock || 0) * (variant.costPrice || 0),
        0,
      );

      totalInventoryUnits += totalStock;
      totalInventoryValue += inventoryValue;

      if (totalStock === 0) {
        outOfStockProducts++;

        outOfStock.push({
          productId: product._id,
          productName: product.name,
          category: product.category?.name || null,
          stock: 0,
          type: "VARIANT",
        });
      } else {
        productsInStock++;

        if (totalStock <= 10) {
          lowStockProducts++;

          lowStock.push({
            productId: product._id,
            productName: product.name,
            category: product.category?.name || null,
            stock: totalStock,
            type: "VARIANT",
          });
        }
      }
    } else {
      const stock = product.stock || 0;

      totalInventoryUnits += stock;

      totalInventoryValue += stock * (product.costPrice || 0);

      if (stock === 0) {
        outOfStockProducts++;

        outOfStock.push({
          productId: product._id,
          productName: product.name,
          category: product.category?.name || null,
          stock: 0,
          type: "PRODUCT",
        });
      } else {
        productsInStock++;

        if (stock <= 10) {
          lowStockProducts++;

          lowStock.push({
            productId: product._id,
            productName: product.name,
            category: product.category?.name || null,
            stock,
            type: "PRODUCT",
          });
        }
      }
    }
  }

  const data = {
    overview: {
      totalProducts,
      productsInStock,
      lowStockProducts,
      outOfStockProducts,
      totalInventoryUnits,
      totalInventoryValue,
    },

    lowStock: lowStock.sort((a, b) => a.stock - b.stock).slice(0, 10),

    outOfStock: outOfStock.slice(0, 10),
  };

  await setCache(cacheKey, data, 30);

  return data;
};

export const getInventoryMovementStatisticsService = async ({
  period,
  startDate,
  endDate,
}) => {
  const cacheKey = buildDashboardCacheKey("inventory-movements", {
    period,
    startDate,
    endDate,
  });

  const cachedData = await getCache(cacheKey);

  if (cachedData !== null) {
    console.log(`Inventory movement cache HIT: ${cacheKey}`);

    return cachedData;
  }

  console.log(`Inventory movement cache MISS: ${cacheKey}`);

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

  //summary
  const summaryPipeline = [];

  if (matchStage) {
    summaryPipeline.push(matchStage);
  }

  summaryPipeline.push({
    $group: {
      _id: "$movementType",

      totalQuantity: {
        $sum: "$quantity",
      },

      movementCount: {
        $sum: 1,
      },
    },
  });

  const summaryResult = await StockMovement.aggregate(summaryPipeline);

  let stockIn = 0;
  let stockOut = 0;
  let adjustment = 0;

  let stockInCount = 0;
  let stockOutCount = 0;
  let adjustmentCount = 0;

  for (const movement of summaryResult) {
    switch (movement._id) {
      case "IN":
        stockIn = movement.totalQuantity;
        stockInCount = movement.movementCount;
        break;

      case "OUT":
        stockOut = movement.totalQuantity;
        stockOutCount = movement.movementCount;
        break;

      case "ADJUSTMENT":
        adjustment = movement.totalQuantity;
        adjustmentCount = movement.movementCount;
        break;
    }
  }

  // daily movement
  const trendPipeline = [];

  if (matchStage) {
    trendPipeline.push(matchStage);
  }

  trendPipeline.push({
    $group: {
      _id: {
        date: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
          },
        },

        movementType: "$movementType",
      },

      quantity: {
        $sum: "$quantity",
      },
    },
  });

  trendPipeline.push({
    $sort: {
      "_id.date": 1,
    },
  });

  const trendResult = await StockMovement.aggregate(trendPipeline);

  const trendMap = new Map();

  for (const item of trendResult) {
    const date = item._id.date;
    const movementType = item._id.movementType;

    if (!trendMap.has(date)) {
      trendMap.set(date, {
        date,
        stockIn: 0,
        stockOut: 0,
        adjustment: 0,
      });
    }

    const day = trendMap.get(date);

    if (movementType === "IN") {
      day.stockIn = item.quantity;
    }

    if (movementType === "OUT") {
      day.stockOut = item.quantity;
    }

    if (movementType === "ADJUSTMENT") {
      day.adjustment = item.quantity;
    }
  }

  const trend = Array.from(trendMap.values());

  const data = {
    summary: {
      stockIn,
      stockOut,
      adjustment,

      totalMovements: stockInCount + stockOutCount + adjustmentCount,

      stockInCount,
      stockOutCount,
      adjustmentCount,
    },

    trend,
  };

  await setCache(cacheKey, data, 60);

  return data;
};
