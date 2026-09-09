import mongoose from "mongoose";
import Invoice from "../models/invoice.model.js";
import Sale from "../models/sale.model.js";
import Order from "../models/order.model.js";

// Generate invoice number
const generateInvoiceNumber = async () => {
  const count = await Invoice.countDocuments();

  return `INV-${String(count + 1).padStart(5, "0")}`;
};

// Create invoice from sale
export const createInvoiceFromSale = async (saleId, session = null) => {
  if (!mongoose.Types.ObjectId.isValid(saleId)) {
    throw new Error("Invalid sale ID.");
  }

  // Get sale
  let saleQuery = Sale.findById(saleId);

  if (session) {
    saleQuery = saleQuery.session(session);
  }

  const sale = await saleQuery;

  if (!sale) {
    throw new Error("Sale not found.");
  }

  // Prevent duplicate invoice
  let invoiceQuery = Invoice.findOne({
    sale: sale._id,
  });

  if (session) {
    invoiceQuery = invoiceQuery.session(session);
  }

  const existingInvoice = await invoiceQuery;

  if (existingInvoice) {
    return existingInvoice;
  }

  // Invoice should only be created for paid sales
  if (sale.paymentStatus !== "PAID") {
    throw new Error("Invoice can only be created for a paid sale.");
  }

  // Get order + customer
  let orderQuery = Order.findById(sale.order).populate(
    "customer",
    "fullName email phoneNumber",
  );

  if (session) {
    orderQuery = orderQuery.session(session);
  }

  const order = await orderQuery;

  if (!order) {
    throw new Error("Order not found for this sale.");
  }

  if (!order.customer) {
    throw new Error("Customer not found for this order.");
  }

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber();

  const invoiceData = {
    invoiceNumber,

    sale: sale._id,
    order: order._id,
    customer: order.customer._id,

    // Customer snapshot
    customerName: order.customer.fullName,
    customerEmail: order.customer.email || "",
    customerPhone: order.customer.phoneNumber || "",

    // Delivery address snapshot
    deliveryAddress: {
      address: order.deliveryAddress.address,
      contactName: order.deliveryAddress.contactName,
      contactPhone: order.deliveryAddress.contactPhone,
      instructions: order.deliveryAddress.instructions || "",
    },

    // Sale snapshot
    items: sale.items,

    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,

    paymentMethod: sale.paymentMethod,
    paymentStatus: sale.paymentStatus,

    issuedAt: new Date(),
    status: "ISSUED",
  };

  let invoice;

  if (session) {
    const [createdInvoice] = await Invoice.create([invoiceData], { session });

    invoice = createdInvoice;
  } else {
    invoice = await Invoice.create(invoiceData);
  }

  return invoice;
};

// Get all invoices

export const getInvoicesService = async ({
  page = 1,
  limit = 10,
  search,
  status,
  paymentStatus,
  customer,
  fromDate,
  toDate,
}) => {
  page = Number(page);
  limit = Number(limit);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Page must be a positive integer.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Limit must be between 1 and 100.");
  }

  const filter = {};

  // Status filter
  if (status) {
    filter.status = status;
  }

  // Payment status filter
  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  // Customer filter
  if (customer) {
    if (!mongoose.Types.ObjectId.isValid(customer)) {
      throw new Error("Invalid customer ID.");
    }

    filter.customer = customer;
  }

  // Search
  if (search) {
    filter.$or = [
      {
        invoiceNumber: {
          $regex: search,
          $options: "i",
        },
      },
      {
        customerName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        customerEmail: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  // Date filter
  if (fromDate || toDate) {
    filter.issuedAt = {};

    if (fromDate) {
      const startDate = new Date(fromDate);

      if (Number.isNaN(startDate.getTime())) {
        throw new Error("Invalid fromDate.");
      }

      startDate.setHours(0, 0, 0, 0);

      filter.issuedAt.$gte = startDate;
    }

    if (toDate) {
      const endDate = new Date(toDate);

      if (Number.isNaN(endDate.getTime())) {
        throw new Error("Invalid toDate.");
      }

      endDate.setHours(23, 59, 59, 999);

      filter.issuedAt.$lte = endDate;
    }
  }

  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate("customer", "fullName email phoneNumber")
      .populate("sale", "saleNumber total paymentMethod paymentStatus soldAt")
      .populate("order", "orderNumber status")
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(limit),

    Invoice.countDocuments(filter),
  ]);

  return {
    invoices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getInvoiceByIdService = async (invoiceId) => {
  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    throw new Error("Invalid invoice ID.");
  }

  const invoice = await Invoice.findById(invoiceId)
    .populate("customer", "fullName email phoneNumber")
    .populate(
      "sale",
      "saleNumber items subtotal discount total paymentMethod paymentStatus soldAt",
    )
    .populate("order", "orderNumber status deliveryAddress");

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  return invoice;
};

export const getCustomerInvoicesService = async ({
  customerId,
  page = 1,
  limit = 10,
}) => {
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID.");
  }

  page = Number(page);
  limit = Number(limit);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Page must be a positive integer.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Limit must be between 1 and 100.");
  }

  const filter = {
    customer: customerId,
  };

  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate("sale", "saleNumber total paymentMethod paymentStatus soldAt")
      .populate("order", "orderNumber status")
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(limit),

    Invoice.countDocuments(filter),
  ]);

  return {
    invoices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
