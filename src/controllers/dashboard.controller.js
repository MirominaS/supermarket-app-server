import {
  getDashboardOverviewService,
  getRevenueChartService,
  getOrderStatisticsService,
  getPaymentStatisticsService,
  getTopProductsService,
  getCategorySalesStatisticsService,
  getInventoryStatisticsService,
  getInventoryMovementStatisticsService,
} from "../services/dashboard.service.js";

export const getDashboardOverview = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;

    const overview = await getDashboardOverviewService({
      period,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error("Dashboard overview error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getRevenueChart = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;

    const data = await getRevenueChartService({
      period,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Revenue chart error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getOrderStatistics = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;

    const data = await getOrderStatisticsService({
      period,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Order statistics error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPaymentStatistics = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;

    const data = await getPaymentStatisticsService({
      period,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Payment statistics error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTopProducts = async (req, res) => {
  try {
    const { period, startDate, endDate, limit = 5 } = req.query;

    const data = await getTopProductsService({
      period,
      startDate,
      endDate,
      limit,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Top products error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCategorySalesStatistics = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;

    const data = await getCategorySalesStatisticsService({
      period,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Category sales statistics error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getInventoryStatistics = async (req, res) => {
  try {
    const data = await getInventoryStatisticsService();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Inventory statistics error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getInventoryMovementStatistics = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;

    const data = await getInventoryMovementStatisticsService({
      period,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Inventory movement statistics error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
