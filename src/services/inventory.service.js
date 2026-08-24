import mongoose from "mongoose";

import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";
import StockMovement from "../models/stock-movement.model.js";

// =====================================================
// CREATE STOCK MOVEMENT
// =====================================================

export const createStockMovement = async ({
  product,
  variant = null,
  movementType,
  quantity,
  previousStock,
  currentStock,
  reason,
  referenceType = "ADJUSTMENT",
  referenceId = null,
  createdBy = null,
  notes = "",
  session = null,
}) => {
   const movement = new StockMovement({
    product,
    variant,
    movementType,
    quantity,
    previousStock,
    currentStock,
    reason,
    referenceType,
    referenceId,
    createdBy,
    notes,
  });
    await movement.save({ session });

    return movement;
};

// =====================================================
// ADJUST STOCK
// Supports both variant and non-variant products
// =====================================================

export const adjustStock = async ({
  productId,
  variantId = null,
  movementType,
  quantity,
  newStock,
  reason,
  referenceType = "ADJUSTMENT",
  referenceId = null,
  createdBy = null,
  notes = "",
  session = null,
}) => {
  // ---------------------------------------------------
  // Validate Product ID
  // ---------------------------------------------------

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID.");
  }

  // ---------------------------------------------------
  // Validate Variant ID if provided
  // ---------------------------------------------------

  if (variantId !== null && !mongoose.Types.ObjectId.isValid(variantId)) {
    throw new Error("Invalid variant ID.");
  }

  // ---------------------------------------------------
  // Validate Movement Type
  // ---------------------------------------------------

  const allowedMovementTypes = ["IN", "OUT", "ADJUSTMENT", "RETURN"];

  if (!allowedMovementTypes.includes(movementType)) {
    throw new Error("Invalid movement type.");
  }

  // ---------------------------------------------------
  // Validate Reason
  // ---------------------------------------------------

  if (!reason || !reason.trim()) {
    throw new Error("Stock movement reason is required.");
  }

  // ---------------------------------------------------
  // Validate Quantity
  // ---------------------------------------------------

  if (movementType !== "ADJUSTMENT") {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity must be a positive integer.");
    }
  }

  // ---------------------------------------------------
  // Find Product
  // ---------------------------------------------------

  const product = await Product.findById(productId).session(session);

  if (!product) {
    throw new Error("Product not found.");
  }

  // ===================================================
  // PRODUCT WITHOUT VARIANTS
  // ===================================================

  if (!product.hasVariants) {
    // Variant must not be supplied
    if (variantId) {
      throw new Error("This product does not have variants.");
    }

    // Product stock must exist
    if (product.stock === null || product.stock === undefined) {
      throw new Error("Stock is not configured for this product.");
    }

    const previousStock = product.stock;

    let currentStock = previousStock;
    let movementQuantity = quantity;

    // -------------------------------------------------
    // Calculate New Stock
    // -------------------------------------------------

    switch (movementType) {
      case "IN":
        currentStock = previousStock + quantity;
        break;

      case "OUT":
        if (previousStock < quantity) {
          throw new Error(
            `Insufficient stock. Available stock: ${previousStock}.`,
          );
        }

        currentStock = previousStock - quantity;
        break;

      case "RETURN":
        currentStock = previousStock + quantity;
        break;

      case "ADJUSTMENT":
        if (newStock === undefined || newStock === null) {
          throw new Error("newStock is required for stock adjustment.");
        }

        if (!Number.isInteger(newStock) || newStock < 0) {
          throw new Error("New stock must be a non-negative integer.");
        }

        currentStock = newStock;

        movementQuantity = Math.abs(previousStock - currentStock);

        break;

      default:
        throw new Error("Invalid movement type.");
    }

    // -------------------------------------------------
    // Prevent useless adjustment
    // -------------------------------------------------

    if (movementType === "ADJUSTMENT" && previousStock === currentStock) {
      return product;
    }

    // -------------------------------------------------
    // Update Product Stock
    // -------------------------------------------------

    product.stock = currentStock;

    await product.save({ session });

    // -------------------------------------------------
    // Create Stock Movement
    // -------------------------------------------------

    await createStockMovement({
      product: product._id,
      variant: null,
      movementType,
      quantity: movementQuantity,
      previousStock,
      currentStock,
      reason,
      referenceType,
      referenceId,
      createdBy,
      notes,
      session,
    });

    return product;
  }

  // ===================================================
  // PRODUCT WITH VARIANTS
  // ===================================================

  if (!variantId) {
    throw new Error("Variant ID is required for a product with variants.");
  }

  // ---------------------------------------------------
  // Find Variant
  // ---------------------------------------------------

  const variant = await ProductVariant.findOne({
    _id: variantId,
    product: productId,
  }).session(session);

  if (!variant) {
    throw new Error("Product variant not found.");
  }

  // ---------------------------------------------------
  // Get Previous Stock
  // ---------------------------------------------------

  const previousStock = variant.stock;

  let currentStock = previousStock;
  let movementQuantity = quantity;

  // ---------------------------------------------------
  // Calculate New Stock
  // ---------------------------------------------------

  switch (movementType) {
    case "IN":
      currentStock = previousStock + quantity;
      break;

    case "OUT":
      if (previousStock < quantity) {
        throw new Error(
          `Insufficient stock. Available stock: ${previousStock}.`,
        );
      }

      currentStock = previousStock - quantity;
      break;

    case "RETURN":
      currentStock = previousStock + quantity;
      break;

    case "ADJUSTMENT":
      if (newStock === undefined || newStock === null) {
        throw new Error("newStock is required for stock adjustment.");
      }

      if (!Number.isInteger(newStock) || newStock < 0) {
        throw new Error("New stock must be a non-negative integer.");
      }

      currentStock = newStock;

      movementQuantity = Math.abs(previousStock - currentStock);

      break;

    default:
      throw new Error("Invalid movement type.");
  }

  // ---------------------------------------------------
  // Prevent useless adjustment
  // ---------------------------------------------------

  if (movementType === "ADJUSTMENT" && previousStock === currentStock) {
    return variant;
  }

  // ---------------------------------------------------
  // Update Variant Stock
  // ---------------------------------------------------

  variant.stock = currentStock;

  await variant.save({ session });

  // ---------------------------------------------------
  // Create Stock Movement
  // ---------------------------------------------------

  await createStockMovement({
    product: product._id,
    variant: variant._id,
    movementType,
    quantity: movementQuantity,
    previousStock,
    currentStock,
    reason,
    referenceType,
    referenceId,
    createdBy,
    notes,
    session,
  });

  return variant;
};

// =====================================================
// GET LOW STOCK PRODUCTS
// =====================================================

export const getLowStockProducts = async ({ threshold = 10 } = {}) => {
  if (!Number.isInteger(threshold) || threshold < 0) {
    throw new Error("Low stock threshold must be a non-negative integer.");
  }

  // -----------------------------------------------
  // Non-variant products
  // -----------------------------------------------

  const products = await Product.find({
    isActive: true,
    hasVariants: false,
    stock: {
      $lte: threshold,
      $gte: 0,
    },
  })
    .populate("category", "name")
    .sort({
      stock: 1,
    });

  // -----------------------------------------------
  // Variant products
  // -----------------------------------------------

  const variants = await ProductVariant.find({
    isActive: true,
    stock: {
      $lte: threshold,
      $gte: 0,
    },
  })
    .populate("product", "name category")
    .sort({
      stock: 1,
    });

  return {
    products,
    variants,
  };
};

// =====================================================
// GET INVENTORY HISTORY
// =====================================================

export const getInventoryHistory = async ({
  page = 1,
  limit = 10,
  movementType,
  productId,
  variantId,
} = {}) => {
  page = Number(page);
  limit = Number(limit);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Page must be a positive integer.");
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Limit must be a positive integer.");
  }

  const filter = {};

  // -----------------------------------------------
  // Movement type filter
  // -----------------------------------------------

  if (movementType) {
    const allowedMovementTypes = ["IN", "OUT", "ADJUSTMENT", "RETURN"];

    if (!allowedMovementTypes.includes(movementType)) {
      throw new Error("Invalid movement type.");
    }

    filter.movementType = movementType;
  }

  // -----------------------------------------------
  // Product filter
  // -----------------------------------------------

  if (productId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error("Invalid product ID.");
    }

    filter.product = productId;
  }

  // -----------------------------------------------
  // Variant filter
  // -----------------------------------------------

  if (variantId) {
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      throw new Error("Invalid variant ID.");
    }

    filter.variant = variantId;
  }

  // -----------------------------------------------
  // Pagination
  // -----------------------------------------------

  const total = await StockMovement.countDocuments(filter);

  const history = await StockMovement.find(filter)
    .populate("product", "name")
    .populate("variant", "name sku")
    .populate("createdBy", "fullName")
    .sort({
      createdAt: -1,
    })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    history,

    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// =====================================================
// GET INVENTORY SUMMARY
// =====================================================

export const getInventorySummaryService = async () => {
  // -----------------------------------------------
  // Product counts
  // -----------------------------------------------

  const totalProducts = await Product.countDocuments({
    isActive: true,
  });

  const totalVariantProducts = await Product.countDocuments({
    isActive: true,
    hasVariants: true,
  });

  const totalNonVariantProducts = await Product.countDocuments({
    isActive: true,
    hasVariants: false,
  });

  // -----------------------------------------------
  // Variant count
  // -----------------------------------------------

  const totalVariants = await ProductVariant.countDocuments({
    isActive: true,
  });

  // -----------------------------------------------
  // Low stock
  // -----------------------------------------------

  const lowStockProducts = await Product.countDocuments({
    isActive: true,
    hasVariants: false,
    stock: {
      $gt: 0,
      $lte: 10,
    },
  });

  const lowStockVariants = await ProductVariant.countDocuments({
    isActive: true,
    stock: {
      $gt: 0,
      $lte: 10,
    },
  });

  // -----------------------------------------------
  // Out of stock
  // -----------------------------------------------

  const outOfStockProducts = await Product.countDocuments({
    isActive: true,
    hasVariants: false,
    stock: 0,
  });

  const outOfStockVariants = await ProductVariant.countDocuments({
    isActive: true,
    stock: 0,
  });

  // -----------------------------------------------
  // Inventory value - non-variant products
  // -----------------------------------------------

  const productValueResult = await Product.aggregate([
    {
      $match: {
        isActive: true,
        hasVariants: false,
      },
    },

    {
      $group: {
        _id: null,

        inventoryValue: {
          $sum: {
            $multiply: [
              {
                $ifNull: ["$stock", 0],
              },
              {
                $ifNull: ["$costPrice", 0],
              },
            ],
          },
        },
      },
    },
  ]);

  // -----------------------------------------------
  // Inventory value - variants
  // -----------------------------------------------

  const variantValueResult = await ProductVariant.aggregate([
    {
      $match: {
        isActive: true,
      },
    },

    {
      $group: {
        _id: null,

        inventoryValue: {
          $sum: {
            $multiply: [
              {
                $ifNull: ["$stock", 0],
              },
              {
                $ifNull: ["$costPrice", 0],
              },
            ],
          },
        },
      },
    },
  ]);

  const productInventoryValue = productValueResult[0]?.inventoryValue || 0;

  const variantInventoryValue = variantValueResult[0]?.inventoryValue || 0;

  return {
    totalProducts,
    totalVariantProducts,
    totalNonVariantProducts,
    totalVariants,

    lowStock: lowStockProducts + lowStockVariants,

    outOfStock: outOfStockProducts + outOfStockVariants,

    inventoryValue: productInventoryValue + variantInventoryValue,
  };
};
