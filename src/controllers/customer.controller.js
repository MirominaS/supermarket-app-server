import {
  getCustomersService,
  getCustomerByIdService,
  getCustomerOrdersService,
  getCustomerSalesService,
  getCustomerSummaryService,
  updateCustomerStatusService,
} from "../services/customer.service.js";

// Get all customers
export const getCustomers = async (req, res) => {
  try {
    const {
      page,
      limit,
      search,
      isActive,
    } = req.query;

    const result = await getCustomersService({
      page,
      limit,
      search,
      isActive,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Get customers error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get customer by ID
export const getCustomerById = async (req, res) => {
  try {
    const customer = await getCustomerByIdService(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error(
      "Get customer by ID error:",
      error
    );

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Get customer's orders
export const getCustomerOrders = async (req, res) => {
  try {
    const {
      page,
      limit,
    } = req.query;

    const result = await getCustomerOrdersService({
      customerId: req.params.id,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Get customer orders error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get customer's sales
export const getCustomerSales = async (req, res) => {
  try {
    const {
      page,
      limit,
    } = req.query;

    const result = await getCustomerSalesService({
      customerId: req.params.id,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Get customer sales error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get customer summary
export const getCustomerSummary = async (req, res) => {
  try {
    const result =
      await getCustomerSummaryService(
        req.params.id
      );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Get customer summary error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Activate / deactivate customer
export const updateCustomerStatus = async (
  req,
  res
) => {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: "isActive is required.",
      });
    }

    const customer =
      await updateCustomerStatusService(
        req.params.id,
        isActive
      );

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Customer activated successfully."
        : "Customer deactivated successfully.",
      customer,
    });
  } catch (error) {
    console.error(
      "Update customer status error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};