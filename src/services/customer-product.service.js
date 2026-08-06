import mongoose from "mongoose";
import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";

export const getCustomerProductsService = async ({
  page = 1,
  limit = 10,
  search,
  category,
  sort = "newest",
}) => {
  page = Number(page);
  limit = Number(limit);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Invalid page.");
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Invalid limit.");
  }

  const filter = {
    isActive: true,
  };

  if (search) {
    filter.name = {
      $regex: search,
      $options: "i",
    };
  }

  if (category) {
    if (!mongoose.Types.ObjectId.isValid(category)) {
      throw new Error("Invalid category.");
    }

    filter.category = category;
  }

  let sortOption = {
    createdAt: -1,
  };

  switch (sort) {
    case "oldest":
      sortOption = { createdAt: 1 };
      break;

    case "name_asc":
      sortOption = { name: 1 };
      break;

    case "name_desc":
      sortOption = { name: -1 };
      break;
  }

  const total = await Product.countDocuments(filter);

  const products = await Product.find(filter)
    .populate("category")
    .populate("image")
    .sort(sortOption)
    .skip((page - 1) * limit)
    .limit(limit);

  const result = [];

  for (const product of products) {
    const variants = await ProductVariant.find({
      product: product._id,
      isActive: true,
      stock: {
        $gt: 0,
      },
    }).sort({
      price: 1,
    });

    if (variants.length === 0) {
      continue;
    }

    result.push({
      ...product.toObject(),
      variants,
    });
  }

  return {
    products: result,

    pagination: {
      total: result.length,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

export const getCustomerProductByIdService = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID.");
  }

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  })
    .populate("category")
    .populate("image");

  if (!product) {
    throw new Error("Product not found.");
  }

  const variants = await ProductVariant.find({
    product: product._id,
    isActive: true,
    stock: {
      $gt: 0,
    },
  }).sort({
    price: 1,
  });

  return {
    ...product.toObject(),
    variants,
  };
};
