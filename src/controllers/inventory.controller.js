import {
  adjustStock,
  getLowStockProducts,
  getInventoryHistory,
   getInventorySummaryService,
} from "../services/inventory.service.js";

export const updateStock = async (req, res) => {
  try {
    const {
      productId,
      variantId,
      movementType,
      quantity,
      reason,
      referenceType,
      referenceId,
      notes,
    } = req.body;

    const variant = await adjustStock({
      productId,
      variantId,
      movementType,
      quantity,
      reason,
      referenceType,
      referenceId,
      createdBy: req.user._id,
      notes,
    });

    res.status(200).json({
      success: true,
      message: "Stock updated successfully.",
      variant,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getLowStock = async (req, res) => {
  try {
    const products = await getLowStockProducts();

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getStockHistory = async (req, res) => {
  try {
    const { page, limit, movementType } = req.query;

    const history = await getInventoryHistory({
      page,
      limit,
      movementType,
    });

    res.status(200).json({
      success: true,
      ...history,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getInventorySummary = async (req, res) => {
  try {
    const summary = await getInventorySummaryService();

    res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};