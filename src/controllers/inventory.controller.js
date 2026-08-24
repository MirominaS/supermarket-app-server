import {
  adjustStock,
  getLowStockProducts,
  getInventoryHistory,
  getInventorySummaryService,
} from "../services/inventory.service.js";

// =====================================================
// UPDATE STOCK
// =====================================================

export const updateStock = async (req, res) => {
  try {
    const {
      productId,
      variantId,
      movementType,
      quantity,
      newStock,
      reason,
      referenceType,
      referenceId,
      notes,
    } = req.body;

    // Product ID is always required
    if (!productId || !movementType || !reason) {
      return res.status(400).json({
        success: false,
        message:
          "Product ID, movement type and reason are required.",
      });
    }

    const stockItem = await adjustStock({
      productId,
      variantId: variantId || null,
      movementType,
      quantity:
        quantity !== undefined
          ? Number(quantity)
          : undefined,
      newStock:
        newStock !== undefined
          ? Number(newStock)
          : undefined,
      reason,
      referenceType,
      referenceId,
      createdBy: req.user._id,
      notes,
    });

    return res.status(200).json({
      success: true,
      message: "Stock updated successfully.",
      stockItem,
    });
  } catch (error) {
    console.error("Update stock error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// GET LOW STOCK
// =====================================================

export const getLowStock = async (req, res) => {
  try {
    const threshold =
      req.query.threshold !== undefined
        ? Number(req.query.threshold)
        : 10;

    const result = await getLowStockProducts({
      threshold,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Get low stock error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// GET STOCK HISTORY
// =====================================================

export const getStockHistory = async (req, res) => {
  try {
    const {
      page,
      limit,
      movementType,
      productId,
      variantId,
    } = req.query;

    const result = await getInventoryHistory({
      page,
      limit,
      movementType,
      productId,
      variantId,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Get stock history error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// GET INVENTORY SUMMARY
// =====================================================

export const getInventorySummary = async (req, res) => {
  try {
    const summary = await getInventorySummaryService();

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Get inventory summary error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};