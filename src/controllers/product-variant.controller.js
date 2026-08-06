import mongoose from "mongoose";

import {
  createVariantService,
  getVariantsService,
  updateVariantService,
  deleteVariantService,
} from "../services/product-variant.service.js";

// Create variant
export const createVariant = async (req, res) => {
  try {
    const { productId } = req.params;

    const {
      name,
      sku,
      barcode,
      price,
      costPrice,
      stock,
      unit,
      isDefault,
    } = req.body;

    if (
      !name ||
      !sku ||
      price === undefined ||
      stock === undefined ||
      !unit
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, SKU, price, stock and unit are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const variant = await createVariantService(
      productId,
      {
        name,
        sku,
        barcode,
        price,
        costPrice,
        stock,
        unit,
        isDefault,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Variant created successfully.",
      variant,
    });
  } catch (error) {
    console.error(
      "Create variant error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all variants
export const getVariants = async (
  req,
  res
) => {
  try {
    const variants =
      await getVariantsService(
        req.params.productId
      );

    return res.status(200).json({
      success: true,
      count: variants.length,
      variants,
    });
  } catch (error) {
    console.error(
      "Get variants error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Update variant
export const updateVariant = async (
  req,
  res
) => {
  try {
    const variant =
      await updateVariantService(
        req.params.productId,
        req.params.variantId,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        "Variant updated successfully.",
      variant,
    });
  } catch (error) {
    console.error(
      "Update variant error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete variant
export const deleteVariant = async (
  req,
  res
) => {
  try {
    await deleteVariantService(
      req.params.productId,
      req.params.variantId
    );

    return res.status(200).json({
      success: true,
      message:
        "Variant deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete variant error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};