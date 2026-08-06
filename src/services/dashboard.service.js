import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import Sale from "../models/sale.model.js";

export const getDashboardService = async () => {
  const now = new Date();

 // DATE RANGES

  // Today
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(
    startOfTomorrow.getDate() + 1
  );

  // Start of current week - Monday
  const startOfWeek = new Date(now);

  const day = startOfWeek.getDay();
  const diff = day === 0 ? 6 : day - 1;

  startOfWeek.setDate(
    startOfWeek.getDate() - diff
  );

  startOfWeek.setHours(0, 0, 0, 0);

  // Start of current month
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

    // TODAY'S REVENUE
  const todayRevenueResult = await Sale.aggregate([
    {
      $match: {
        soldAt: {
          $gte: startOfToday,
          $lt: startOfTomorrow,
        },
      },
    },

    {
      $group: {
        _id: null,

        revenue: {
          $sum: "$total",
        },
      },
    },
  ]);

  const todayRevenue =
    todayRevenueResult[0]?.revenue || 0;

  // TODAY'S SALES
   const todaySales = await Sale.countDocuments({
    soldAt: {
      $gte: startOfToday,
      $lt: startOfTomorrow,
    },
  });

   // TODAY'S ORDERS
  const todayOrders = await Order.countDocuments({
    createdAt: {
      $gte: startOfToday,
      $lt: startOfTomorrow,
    },
  });

  // PENDING ORDERS
  const pendingOrders = await Order.countDocuments({
    status: "PENDING",
  });

 
  // TOTAL CUSTOMERS
  const totalCustomers = await User.countDocuments({
    role: "CUSTOMER",
  });


  // ACTIVE CUSTOMERS
  const activeCustomers = await User.countDocuments({
    role: "CUSTOMER",
    isActive: true,
  });

  // ACTIVE PRODUCTS
 
  const activeProducts = await Product.countDocuments({
    isActive: true,
  });


  // LOW STOCK PRODUCTS
  const lowStockProducts = await Product.countDocuments({
    isActive: true,
    stock: {
      $lte: 10,
    },
  });


  // WEEKLY REVENUE
  const weeklyRevenueResult = await Sale.aggregate([
    {
      $match: {
        soldAt: {
          $gte: startOfWeek,
          $lte: now,
        },
      },
    },

    {
      $group: {
        _id: null,

        revenue: {
          $sum: "$total",
        },
      },
    },
  ]);

  const weeklyRevenue =
    weeklyRevenueResult[0]?.revenue || 0;


  // MONTHLY REVENUE
  const monthlyRevenueResult =
    await Sale.aggregate([
      {
        $match: {
          soldAt: {
            $gte: startOfMonth,
            $lte: now,
          },
        },
      },

      {
        $group: {
          _id: null,

          revenue: {
            $sum: "$total",
          },
        },
      },
    ]);

  const monthlyRevenue =
    monthlyRevenueResult[0]?.revenue || 0;

  const revenueChart = await Sale.aggregate([
    {
      $match: {
        soldAt: {
          $gte: startOfMonth,
          $lte: now,
        },
      },
    },

    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$soldAt",
          },
        },

        revenue: {
          $sum: "$total",
        },
      },
    },

    {
      $sort: {
        _id: 1,
      },
    },

    {
      $project: {
        _id: 0,
        date: "$_id",
        revenue: 1,
      },
    },
  ]);

   const salesChart = await Sale.aggregate([
    {
      $match: {
        soldAt: {
          $gte: startOfMonth,
          $lte: now,
        },
      },
    },

    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$soldAt",
          },
        },

        sales: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        _id: 1,
      },
    },

    {
      $project: {
        _id: 0,
        date: "$_id",
        sales: 1,
      },
    },
  ]);

   const categorySales = await Sale.aggregate([
    {
      $match: {
        soldAt: {
          $gte: startOfMonth,
          $lte: now,
        },
      },
    },

    // Break sale into products
    {
      $unwind: "$items",
    },

    // Find product
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "product",
      },
    },

    {
      $unwind: "$product",
    },

    // Find category
    {
      $lookup: {
        from: "categories",
        localField: "product.category",
        foreignField: "_id",
        as: "category",
      },
    },

    {
      $unwind: "$category",
    },

    // Group by category
    {
      $group: {
        _id: "$category._id",

        categoryName: {
          $first: "$category.name",
        },

        revenue: {
          $sum: "$items.subtotal",
        },

        quantitySold: {
          $sum: "$items.quantity",
        },
      },
    },

    // Highest revenue first
    {
      $sort: {
        revenue: -1,
      },
    },

    {
      $project: {
        _id: 0,
        categoryId: "$_id",
        categoryName: 1,
        revenue: 1,
        quantitySold: 1,
      },
    },
  ]);

  const topProducts = await Sale.aggregate([
    {
      $match: {
        soldAt: {
          $gte: startOfMonth,
          $lte: now,
        },
      },
    },

    // Break sale into products
    {
      $unwind: "$items",
    },

    // Group products
    {
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
      },
    },

    // Highest quantity first
    {
      $sort: {
        quantitySold: -1,
      },
    },

    // Top 5
    {
      $limit: 5,
    },

    {
      $project: {
        _id: 0,
        productId: "$_id",
        productName: 1,
        sku: 1,
        quantitySold: 1,
        revenue: 1,
      },
    },
  ]);

 // RECENT ORDERS
   const recentOrders = await Order.find()
    .populate(
      "customer",
      "fullName email phoneNumber"
    )
    .populate(
      "items.product",
      "name sku price"
    )
    .sort({
      createdAt: -1,
    })
    .limit(10);

   // FINAL DASHBOARD RESPONSE
   return {
    summary: {
      revenue: {
        today: todayRevenue,
        week: weeklyRevenue,
        month: monthlyRevenue,
      },

      sales: {
        today: todaySales,
      },

      orders: {
        today: todayOrders,
        pending: pendingOrders,
      },

      customers: {
        total: totalCustomers,
        active: activeCustomers,
      },

      products: {
        active: activeProducts,
        lowStock: lowStockProducts,
      },
    },

    graphs: {
      revenueChart,
      salesChart,
      categorySales,
      topProducts,
    },

    recentOrders,
  };
};