import {
  getSalesService,
  getSaleByIdService,
  getSalesSummaryService,
  getRevenueService,
  getSoldProductsService,
  getCategorySalesService,
} from "../services/sales.service.js";

// Get all sales
export const getSales = async (req, res) => {
  try {
    const {
      page,
      limit,
      period,
      startDate,
      endDate,
      customer,
      paymentMethod,
    } = req.query;

    const result = await getSalesService({
      page,
      limit,
      period,
      startDate,
      endDate,
      customer,
      paymentMethod,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Get sales error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get sale by ID
export const getSaleById = async (req, res) => {
  try {
    const sale = await getSaleByIdService(req.params.id);

    return res.status(200).json({
      success: true,
      sale,
    });
  } catch (error) {
    console.error("Get sale by ID error:", error);

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Get sales summary
export const getSalesSummary = async (req, res) => {
  try {
    const {
      period,
      startDate,
      endDate,
    } = req.query;

    const summary = await getSalesSummaryService({
      period,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Get sales summary error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get revenue
export const getRevenue = async (req, res) => {
  try {
    const {
      period,
      startDate,
      endDate,
    } = req.query;

    const revenue = await getRevenueService({
      period,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      revenue,
    });
  } catch (error) {
    console.error("Get revenue error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get sold products
export const getSoldProducts = async (req, res) => {
  try {
    const {
      page,
      limit,
      period,
      startDate,
      endDate,
    } = req.query;

    const result = await getSoldProductsService({
      page,
      limit,
      period,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Get sold products error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get category sales
export const getCategorySales = async (req, res) => {
  try {
    const {
      page,
      limit,
      period,
      startDate,
      endDate,
    } = req.query;

    const result = await getCategorySalesService({
      page,
      limit,
      period,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Get category sales error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};