import mongoose from "mongoose";
import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";
import StockMovement from "../models/stock-movement.model.js";

export const createStockMovement = async ({
  product,
  variant,
  movementType,
  quantity,
  previousStock,
  currentStock,
  reason,
  referenceType = "ADJUSTMENT",
  referenceId = null,
  createdBy = null,
  notes = "",
}) => {
  return await StockMovement.create({
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
};

export const adjustStock = async ({
  productId,
  variantId,
  movementType,
  quantity,
  newStock,
  reason,
  referenceType = "ADJUSTMENT",
  referenceId = null,
  createdBy = null,
  notes = "",
}) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID.");
  }

  if (!mongoose.Types.ObjectId.isValid(variantId)) {
    throw new Error("Invalid variant ID.");
  }

  if (movementType !== "ADJUSTMENT" && quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new Error("Product not found.");
  }

  const variant = await ProductVariant.findOne({
    _id: variantId,
    product: productId,
  });

  if (!variant) {
    throw new Error("Product variant not found.");
  }

  const previousStock = variant.stock;

  let currentStock = previousStock;

  switch (movementType) {
    case "IN":
      currentStock += quantity;
      break;

    case "OUT":
      if (previousStock < quantity) {
        throw new Error("Insufficient stock.");
      }

      currentStock -= quantity;
      break;

    case "ADJUSTMENT":
      if (newStock < 0) {
        throw new Error("Stock cannot be negative.");
      }

      currentStock = newStock;

      quantity = Math.abs(previousStock - currentStock);

      break;

    case "RETURN":
      currentStock += quantity;
      break;

    default:
      throw new Error("Invalid movement type.");
  }

  variant.stock = currentStock;

  await variant.save();

  await createStockMovement({
    product: product._id,
    variant: variant._id,
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

  return variant;
};

export const getLowStockProducts = async () => {
  return await ProductVariant.find({
    isActive: true,
    stock: {
      $lte: 10,
    },
  })
    .populate("product", "name")
    .sort({
      stock: 1,
    });
};

export const getInventoryHistory = async ({
  page = 1,
  limit = 10,
  movementType,
}) => {
  const filter = {};

  if (movementType) {
    filter.movementType = movementType;
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
    .limit(Number(limit));

  return {
    history,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getInventorySummaryService = async () => {
  const totalProducts = await Product.countDocuments({
    isActive: true,
  });

  const totalVariants = await ProductVariant.countDocuments({
    isActive: true,
  });

  const lowStock = await ProductVariant.countDocuments({
    isActive: true,
    stock: {
      $gt: 0,
      $lte: 10,
    },
  });

  const outOfStock = await ProductVariant.countDocuments({
    isActive: true,
    stock: 0,
  });

  // Calculate total inventory value
  const inventoryValueResult = await ProductVariant.aggregate([
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
            $multiply: ["$stock", "$price"],
          },
        },
      },
    },
  ]);

  return {
    totalProducts,
    totalVariants,
    lowStock,
    outOfStock,
    inventoryValue:
      inventoryValueResult[0]?.inventoryValue || 0,
  };
};