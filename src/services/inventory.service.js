import mongoose from "mongoose";

import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";
import StockMovement from "../models/stock-movement.model.js";

// CREATE STOCK MOVEMENT
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

// ADJUST STOCK
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
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID.");
  }

  if (variantId !== null && !mongoose.Types.ObjectId.isValid(variantId)) {
    throw new Error("Invalid variant ID.");
  }

  const allowedMovementTypes = ["IN", "OUT", "ADJUSTMENT", "RETURN"];

  if (!allowedMovementTypes.includes(movementType)) {
    throw new Error("Invalid movement type.");
  }

  if (!reason || !reason.trim()) {
    throw new Error("Stock movement reason is required.");
  }

  if (movementType !== "ADJUSTMENT") {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity must be a positive integer.");
    }
  }

  const product = await Product.findById(productId).session(session);

  if (!product) {
    throw new Error("Product not found.");
  }

  // PRODUCT WITHOUT VARIANTS
  if (!product.hasVariants) {
    if (variantId) {
      throw new Error("This product does not have variants.");
    }

    if (product.stock === null || product.stock === undefined) {
      throw new Error("Stock is not configured for this product.");
    }

    let updatedProduct;
    let previousStock;
    let currentStock;
    let movementQuantity = quantity;

    if (movementType === "OUT") {
      // Deduct only if enough stock remains.
      updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          hasVariants: false,
          stock: { $gte: quantity },
        },
        {
          $inc: { stock: -quantity },
        },
        {
          new: true,
          session,
          runValidators: true,
        },
      );

      if (!updatedProduct) {
        const latestProduct =
          await Product.findById(productId).session(session);

        if (!latestProduct) {
          throw new Error("Product not found.");
        }

        throw new Error(
          `Insufficient stock. Available stock: ${latestProduct.stock}.`,
        );
      }

      currentStock = updatedProduct.stock;
      previousStock = currentStock + quantity;
    } else if (movementType === "IN" || movementType === "RETURN") {
      updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          hasVariants: false,
        },
        {
          $inc: { stock: quantity },
        },
        {
          new: true,
          session,
          runValidators: true,
        },
      );

      if (!updatedProduct) {
        throw new Error("Product not found.");
      }

      currentStock = updatedProduct.stock;
      previousStock = currentStock - quantity;
    } else if (movementType === "ADJUSTMENT") {
      if (
        newStock === undefined ||
        newStock === null ||
        !Number.isInteger(newStock) ||
        newStock < 0
      ) {
        throw new Error("New stock must be a non-negative integer.");
      }

      previousStock = product.stock;

      updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          hasVariants: false,
          stock: previousStock,
        },
        {
          $set: { stock: newStock },
        },
        {
          new: true,
          session,
          runValidators: true,
        },
      );

      if (!updatedProduct) {
        throw new Error("Stock changed during adjustment. Please try again.");
      }

      currentStock = updatedProduct.stock;
      movementQuantity = Math.abs(previousStock - currentStock);
    } else {
      throw new Error("Invalid movement type.");
    }

    if (previousStock === currentStock) {
      return updatedProduct;
    }

    await createStockMovement({
      product: updatedProduct._id,
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

    return updatedProduct;
  }

  // PRODUCT WITH VARIANTS

  // PRODUCT WITH VARIANTS
  if (!variantId) {
    throw new Error("Variant ID is required for a product with variants.");
  }

  const variant = await ProductVariant.findOne({
    _id: variantId,
    product: productId,
  }).session(session);

  if (!variant) {
    throw new Error("Product variant not found.");
  }

  let updatedVariant;
  let previousStock;
  let currentStock;
  let movementQuantity = quantity;

  // 1. Deduct stock atomically
  if (movementType === "OUT") {
    updatedVariant = await ProductVariant.findOneAndUpdate(
      {
        _id: variantId,
        product: productId,
        stock: { $gte: quantity },
      },
      {
        $inc: { stock: -quantity },
      },
      {
        new: true,
        session,
        runValidators: true,
      },
    );

    if (!updatedVariant) {
      const latestVariant = await ProductVariant.findOne({
        _id: variantId,
        product: productId,
      }).session(session);

      if (!latestVariant) {
        throw new Error("Product variant not found.");
      }

      throw new Error(
        `Insufficient stock. Available stock: ${latestVariant.stock}.`,
      );
    }

    currentStock = updatedVariant.stock;
    previousStock = currentStock + quantity;
  }

  // 2. Add stock for incoming stock or returns
  else if (movementType === "IN" || movementType === "RETURN") {
    updatedVariant = await ProductVariant.findOneAndUpdate(
      {
        _id: variantId,
        product: productId,
      },
      {
        $inc: { stock: quantity },
      },
      {
        new: true,
        session,
        runValidators: true,
      },
    );

    if (!updatedVariant) {
      throw new Error("Product variant not found.");
    }

    currentStock = updatedVariant.stock;
    previousStock = currentStock - quantity;
  }

  // 3. Set stock to a specific value
  else if (movementType === "ADJUSTMENT") {
    if (
      newStock === undefined ||
      newStock === null ||
      !Number.isInteger(newStock) ||
      newStock < 0
    ) {
      throw new Error("New stock must be a non-negative integer.");
    }

    previousStock = variant.stock;

    updatedVariant = await ProductVariant.findOneAndUpdate(
      {
        _id: variantId,
        product: productId,
        stock: previousStock,
      },
      {
        $set: { stock: newStock },
      },
      {
        new: true,
        session,
        runValidators: true,
      },
    );

    if (!updatedVariant) {
      throw new Error(
        "Stock changed during adjustment. Please try again.",
      );
    }

    currentStock = updatedVariant.stock;
    movementQuantity = Math.abs(previousStock - currentStock);
  }

  else {
    throw new Error("Invalid movement type.");
  }

  // No need to record an adjustment if stock did not change.
  if (previousStock === currentStock) {
    return updatedVariant;
  }

  // 4. Save the inventory history
  await createStockMovement({
    product: product._id,
    variant: updatedVariant._id,
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

  return updatedVariant;
};

// GET LOW STOCK PRODUCTS
export const getLowStockProducts = async ({ threshold = 10 } = {}) => {
  if (!Number.isInteger(threshold) || threshold < 0) {
    throw new Error("Low stock threshold must be a non-negative integer.");
  }

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

// GET INVENTORY HISTORY
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

  if (movementType) {
    const allowedMovementTypes = ["IN", "OUT", "ADJUSTMENT", "RETURN"];

    if (!allowedMovementTypes.includes(movementType)) {
      throw new Error("Invalid movement type.");
    }

    filter.movementType = movementType;
  }

  if (productId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error("Invalid product ID.");
    }

    filter.product = productId;
  }

  if (variantId) {
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      throw new Error("Invalid variant ID.");
    }

    filter.variant = variantId;
  }

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

// GET INVENTORY SUMMARY
export const getInventorySummaryService = async () => {
  // Product counts
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

  // Variant count
  const totalVariants = await ProductVariant.countDocuments({
    isActive: true,
  });

  // Low stock
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

  // Out of stock
  const outOfStockProducts = await Product.countDocuments({
    isActive: true,
    hasVariants: false,
    stock: 0,
  });

  const outOfStockVariants = await ProductVariant.countDocuments({
    isActive: true,
    stock: 0,
  });

  // Inventory value - non-variant products
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

  // Inventory value - variants
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
