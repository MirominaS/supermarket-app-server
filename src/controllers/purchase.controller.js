import {
  createPurchaseService,
  getPurchasesService,
  getPurchaseByIdService,
  updatePurchaseService,
  orderPurchaseService,
  receivePurchaseService,
  cancelPurchaseService,
} from "../services/purchase.service.js";

// =====================================================
// CREATE PURCHASE
// =====================================================

export const createPurchase = async (req, res) => {
  try {
    const {
      supplier,
      items,
      discount,
      notes,
    } = req.body;

    if (!supplier || !items) {
      return res.status(400).json({
        success: false,
        message: "Supplier and items are required.",
      });
    }

    const purchase = await createPurchaseService({
      supplier,
      items,
      discount: discount !== undefined
        ? Number(discount)
        : 0,
      notes,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Purchase created successfully.",
      purchase,
    });
  } catch (error) {
    console.error("Create purchase error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// GET ALL PURCHASES
// =====================================================

export const getPurchases = async (req, res) => {
  try {
    const {
      page,
      limit,
      status,
      supplier,
    } = req.query;

    const result = await getPurchasesService({
      page,
      limit,
      status,
      supplier,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Get purchases error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// GET PURCHASE BY ID
// =====================================================

export const getPurchaseById = async (req, res) => {
  try {
    const purchase =
      await getPurchaseByIdService(req.params.id);

    return res.status(200).json({
      success: true,
      purchase,
    });
  } catch (error) {
    console.error(
      "Get purchase by ID error:",
      error,
    );

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// UPDATE PURCHASE
// =====================================================

export const updatePurchase = async (req, res) => {
  try {
    const purchase =
      await updatePurchaseService(
        req.params.id,
        req.body,
      );

    return res.status(200).json({
      success: true,
      message: "Purchase updated successfully.",
      purchase,
    });
  } catch (error) {
    console.error("Update purchase error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// MARK PURCHASE AS ORDERED
// =====================================================

export const orderPurchase = async (req, res) => {
  try {
    const purchase =
      await orderPurchaseService(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Purchase marked as ordered.",
      purchase,
    });
  } catch (error) {
    console.error(
      "Order purchase error:",
      error,
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// RECEIVE PURCHASE
// =====================================================

export const receivePurchase = async (req, res) => {
  try {
    const {
      receivedItems,
    } = req.body;

    if (
      !Array.isArray(receivedItems) ||
      receivedItems.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Received items are required.",
      });
    }

    const purchase =
      await receivePurchaseService({
        purchaseId: req.params.id,
        receivedItems,
        createdBy: req.user._id,
      });

    return res.status(200).json({
      success: true,
      message: "Purchase received successfully.",
      purchase,
    });
  } catch (error) {
    console.error(
      "Receive purchase error:",
      error,
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// CANCEL PURCHASE
// =====================================================

export const cancelPurchase = async (req, res) => {
  try {
    const purchase =
      await cancelPurchaseService(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Purchase cancelled successfully.",
      purchase,
    });
  } catch (error) {
    console.error(
      "Cancel purchase error:",
      error,
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};