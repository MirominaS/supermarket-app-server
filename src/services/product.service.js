import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Media from "../models/media.model.js";
import ProductVariant from "../models/product-variant.model.js";

export const createProductService = async (productData) => {
  const category = await Category.findById(productData.category);

  if (!category) {
    throw new Error("Category not found.");
  }

  // Validate product image
  if (productData.image) {
    const media = await Media.findOne({
      _id: productData.image,
      folder: "product-images",
      type: "image",
      visibility: "public",
    });

    if (!media) {
      throw new Error("Invalid product image.");
    }
  }

  const product = await Product.create({
    name: productData.name,
    description: productData.description,
    category: productData.category,
    image: productData.image,
  });

  return await Product.findById(product._id)
    .populate("category")
    .populate("image");
};

export const getProductsService = async () => {
  const products = await Product.find()
    .populate("category")
    .populate("image")
    .sort({
      createdAt: -1,
    });

  const result = [];

  for (const product of products) {
    const variants = await ProductVariant.find({
      product: product._id,
      isActive: true,
    }).sort({
      createdAt: 1,
    });

    result.push({
      ...product.toObject(),
      variants,
    });
  }

  return result;
};

export const getProductByIdService = async (productId) => {
  const product = await Product.findById(productId)
    .populate("category")
    .populate("image");

  if (!product) {
    throw new Error("Product not found.");
  }

  const variants = await ProductVariant.find({
    product: product._id,
  }).sort({
    createdAt: 1,
  });

  return {
    ...product.toObject(),
    variants,
  };
};

export const updateProductService = async (productId, updateData) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new Error("Product not found.");
  }

  // Validate category
  if (updateData.category) {
    const category = await Category.findById(updateData.category);

    if (!category) {
      throw new Error("Category not found.");
    }
  }

  // Validate image
  if (updateData.image) {
    const media = await Media.findOne({
      _id: updateData.image,
      folder: "product-images",
      type: "image",
      visibility: "public",
    });

    if (!media) {
      throw new Error("Invalid product image.");
    }
  }

  product.name = updateData.name ?? product.name;

  product.description = updateData.description ?? product.description;

  product.category = updateData.category ?? product.category;

  product.image = updateData.image ?? product.image;

  if (typeof updateData.isActive === "boolean") {
    product.isActive = updateData.isActive;
  }

  await product.save();

  return await Product.findById(product._id)
    .populate("category")
    .populate("image");
};

export const deleteProductService = async (productId) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new Error("Product not found.");
  }

  // Delete all variants
  await ProductVariant.deleteMany({
    product: product._id,
  });

  await product.deleteOne();

  return product;
};
