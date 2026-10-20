import mongoose from "mongoose";
import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import Sale from "../models/sale.model.js";
import AccountDeletion from "../models/account-deletion.model.js";

export const getCustomersService = async ({
  page = 1,
  limit = 10,
  search,
  isActive,
}) => {
  page = Number(page);
  limit = Number(limit);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Page must be a positive integer.");
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Limit must be a positive integer.");
  }

  const filter = {
    role: "CUSTOMER",
  };

  // Search customer
  if (search) {
    filter.$or = [
      {
        fullName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        email: {
          $regex: search,
          $options: "i",
        },
      },
      {
        phoneNumber: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  // Active/inactive filter
  if (isActive !== undefined) {
    if (isActive !== "true" && isActive !== "false") {
      throw new Error("isActive must be true or false.");
    }

    filter.isActive = isActive === "true";
  }

  const total = await User.countDocuments(filter);

  
  // Get customers for the requested page
  const customerDocuments = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  // Get IDs for the customers on this page
  const customerIds = customerDocuments.map(
    (customer) => customer._id,
  );

  // Calculate order counts and total spend in parallel
  const [orderStats, spendStats] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          customer: { $in: customerIds },
        },
      },
      {
        $group: {
          _id: "$customer",
          orderCount: { $sum: 1 },
        },
      },
    ]),

    Sale.aggregate([
      {
        $match: {
          customer: { $in: customerIds },
        },
      },
      {
        $group: {
          _id: "$customer",
          totalSpend: { $sum: "$total" },
        },
      },
    ]),
  ]);

  // Make lookup maps for quick access to each customer's statistics
  const orderCountMap = new Map(
    orderStats.map((item) => [
      item._id.toString(),
      item.orderCount,
    ]),
  );

  const totalSpendMap = new Map(
    spendStats.map((item) => [
      item._id.toString(),
      item.totalSpend,
    ]),
  );

  // Add statistics to each customer
  const customers = customerDocuments.map((customer) => {
    const customerId = customer._id.toString();

    return {
      ...customer.toObject(),
      orderCount: orderCountMap.get(customerId) || 0,
      totalSpend: totalSpendMap.get(customerId) || 0,
    };
  });

  return {
    customers,
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

export const getCustomerByIdService = async (customerId) => {
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID.");
  }

  const customer = await User.findOne({
    _id: customerId,
    role: "CUSTOMER",
  }).select("-password");

  if (!customer) {
    throw new Error("Customer not found.");
  }

  return customer;
};

export const getCustomerOrdersService = async ({
  customerId,
  page = 1,
  limit = 10,
}) => {
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID.");
  }

  page = Number(page);
  limit = Number(limit);

  const customer = await User.findOne({
    _id: customerId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const filter = {
    customer: customerId,
  };

  const total = await Order.countDocuments(filter);

  const orders = await Order.find(filter)
    .populate("items.product", "name sku price")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    orders,
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

export const getCustomerSalesService = async ({
  customerId,
  page = 1,
  limit = 10,
}) => {
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID.");
  }

  page = Number(page);
  limit = Number(limit);

  const customer = await User.findOne({
    _id: customerId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const filter = {
    customer: customerId,
  };

  const total = await Sale.countDocuments(filter);

  const sales = await Sale.find(filter)
    .populate("order", "orderNumber status")
    .populate("items.product", "name sku price")
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

export const getCustomerSummaryService = async (customerId) => {
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID.");
  }

  const customer = await User.findOne({
    _id: customerId,
    role: "CUSTOMER",
  }).select("-password");

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const orderSummary = await Order.aggregate([
    {
      $match: {
        customer: new mongoose.Types.ObjectId(customerId),
      },
    },
    {
      $group: {
        _id: null,

        totalOrders: {
          $sum: 1,
        },

        totalOrderValue: {
          $sum: "$total",
        },
      },
    },
  ]);

  const saleSummary = await Sale.aggregate([
    {
      $match: {
        customer: new mongoose.Types.ObjectId(customerId),
      },
    },
    {
      $group: {
        _id: null,

        totalPurchases: {
          $sum: 1,
        },

        totalSpent: {
          $sum: "$total",
        },
      },
    },
  ]);

  return {
    customer,

    summary: {
      totalOrders: orderSummary[0]?.totalOrders || 0,

      totalOrderValue: orderSummary[0]?.totalOrderValue || 0,

      totalPurchases: saleSummary[0]?.totalPurchases || 0,

      totalSpent: saleSummary[0]?.totalSpent || 0,
    },
  };
};

export const updateCustomerStatusService = async (customerId, isActive) => {
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID.");
  }

  if (typeof isActive !== "boolean") {
    throw new Error("isActive must be a boolean.");
  }

  const customer = await User.findOne({
    _id: customerId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  customer.isActive = isActive;

  await customer.save();

  return await User.findById(customer._id).select("-password");
};

export const getCustomerClosureReasonsService = async () => {
  const reasons = await AccountDeletion.aggregate([
    {
      $group: {
        _id: {
          $let: {
            vars: {
              cleanedReason: {
                $trim: {
                  input: {
                    $ifNull: ["$reason", ""],
                  },
                },
              },
            },
            in: {
              $cond: [
                { $eq: ["$$cleanedReason", ""] },
                "Not specified",
                "$$cleanedReason",
              ],
            },
          },
        },
        count: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        count: -1,
        _id: 1,
      },
    },
    {
      $project: {
        _id: 0,
        reason: "$_id",
        count: 1,
      },
    },
  ]);

  const totalClosures = reasons.reduce((total, item) => total + item.count, 0);

  return {
    reasons,
    totalClosures,
  };
};
