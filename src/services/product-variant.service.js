import mongoose from "mongoose";

import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";

const validateProduct = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID.");
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new Error("Product not found.");
  }

  return product;
};

//create variant
export const createVariantService = async (productId, variantData) => {
  await validateProduct(productId);

  const existingSku = await ProductVariant.findOne({
    sku: variantData.sku,
  });

  if (existingSku) {
    throw new Error("Variant with this SKU already exists.");
  }

  if (variantData.barcode) {
    const existingBarcode = await ProductVariant.findOne({
      barcode: variantData.barcode,
    });

    if (existingBarcode) {
      throw new Error("Variant with this barcode already exists.");
    }
  }

  const variantCount = await ProductVariant.countDocuments({
    product: productId,
  });

  if (variantCount === 0) {
    variantData.isDefault = true;
  }

  if (variantData.isDefault) {
    await ProductVariant.updateMany(
      {
        product: productId,
      },
      {
        isDefault: false,
      },
    );
  }

  const variant = await ProductVariant.create({
    product: productId,
    name: variantData.name,
    sku: variantData.sku,
    barcode: variantData.barcode,
    price: variantData.price,
    costPrice: variantData.costPrice,
    stock: variantData.stock,
    unit: variantData.unit,
    isDefault: variantData.isDefault,
  });

  return variant;
};

//get all variants
export const getVariantsService = async (productId) => {
  await validateProduct(productId);

  return await ProductVariant.find({
    product: productId,
  }).sort({
    createdAt: 1,
  });
};

// get variant by id
export const getVariantByIdService = async (productId, variantId) => {
  
  await validateProduct(productId);

  if (!mongoose.Types.ObjectId.isValid(variantId)) {
    throw new Error("Invalid variant ID.");
  }

  const variant = await ProductVariant.findOne({
    _id: variantId,
    product: productId,
  });

  if (!variant) {
    throw new Error("Variant not found.");
  }

  return variant;
};

// update variant
export const updateVariantService = async (
  productId,
  variantId,
  updateData,
) => {
  await validateProduct(productId);

  if (!mongoose.Types.ObjectId.isValid(variantId)) {
    throw new Error("Invalid variant ID.");
  }

  const variant = await ProductVariant.findOne({
    _id: variantId,
    product: productId,
  });

  if (!variant) {
    throw new Error("Variant not found.");
  }

  if (updateData.sku) {
    const existingSku = await ProductVariant.findOne({
      sku: updateData.sku,
      _id: {
        $ne: variantId,
      },
    });

    if (existingSku) {
      throw new Error("Variant with this SKU already exists.");
    }
  }

  if (updateData.barcode) {
    const existingBarcode = await ProductVariant.findOne({
      barcode: updateData.barcode,
      _id: {
        $ne: variantId,
      },
    });

    if (existingBarcode) {
      throw new Error("Variant with this barcode already exists.");
    }
  }

  if (updateData.isDefault === true) {
    await ProductVariant.updateMany(
      {
        product: productId,
      },
      {
        isDefault: false,
      },
    );
  }

  Object.assign(variant, updateData);

  await variant.save();

  return variant;
};

//delete variant
export const deleteVariantService = async (productId, variantId) => {
  await validateProduct(productId);

  if (!mongoose.Types.ObjectId.isValid(variantId)) {
    throw new Error("Invalid variant ID.");
  }

  const variant = await ProductVariant.findOne({
    _id: variantId,
    product: productId,
  });

  if (!variant) {
    throw new Error("Variant not found.");
  }

  // Get all variants for this product
  const variants = await ProductVariant.find({
    product: productId,
  }).sort({
    createdAt: 1,
  });

  // Prevent deleting the last variant
  if (variants.length === 1) {
    throw new Error(
      "Cannot delete the last variant. Delete the product instead.",
    );
  }

  const wasDefault = variant.isDefault;

  await variant.deleteOne();

  // If default variant was deleted,
  // make the oldest remaining variant the default.
  if (wasDefault) {
    const firstVariant = await ProductVariant.findOne({
      product: productId,
    }).sort({
      createdAt: 1,
    });

    if (firstVariant) {
      firstVariant.isDefault = true;
      await firstVariant.save();
    }
  }

  return {
    message: "Variant deleted successfully.",
  };
};
