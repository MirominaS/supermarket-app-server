import mongoose from "mongoose";

import {
  createProductService,
  getProductsService,
  getProductByIdService,
  updateProductService,
  deleteProductService,
} from "../services/product.service.js";

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      imageId,
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: "Name and category are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    const product = await createProductService({
      name,
      description,
      category,
      image: imageId,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      product,
    });
  } catch (error) {
    console.error("Create product error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProducts = async (req, res) => {
  try {
    const products = await getProductsService();

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products.",
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await getProductByIdService(req.params.id);

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    if (
      req.body.category &&
      !mongoose.Types.ObjectId.isValid(
        req.body.category
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    const product =
      await updateProductService(
        req.params.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      product,
    });
  } catch (error) {
    console.error(
      "Update product error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await deleteProductService(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};
