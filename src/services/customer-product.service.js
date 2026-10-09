import mongoose from "mongoose";
import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";
import { enrichCustomerProductsWithOffers } from "../utils/enrich-customer-products.js";

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

  // Search
  if (search) {
    filter.name = {
      $regex: search.trim(),
      $options: "i",
    };
  }

  // Category filter
  if (category) {
    if (!mongoose.Types.ObjectId.isValid(category)) {
      throw new Error("Invalid category.");
    }

    filter.category = category;
  }

  const availableVariantProducts = await ProductVariant.distinct("product", {
    isActive: true,
    stock: {
      $gt: 0,
    },
  });

  filter.$or = [
    // Products without variants
    {
      hasVariants: {
        $ne: true,
      },
      stock: {
        $gt: 0,
      },
    },

    // Products with variants
    {
      hasVariants: true,
      _id: {
        $in: availableVariantProducts,
      },
    },
  ];

  // Sorting
  let sortOption = {
    createdAt: -1,
  };

  switch (sort) {
    case "newest":
      sortOption = {
        createdAt: -1,
      };
      break;

    case "oldest":
      sortOption = {
        createdAt: 1,
      };
      break;

    case "name_asc":
      sortOption = {
        name: 1,
      };
      break;

    case "name_desc":
      sortOption = {
        name: -1,
      };
      break;

    default:
      throw new Error(
        "Invalid sort option. Use newest, oldest, name_asc or name_desc.",
      );
  }

  // Count available products
  const total = await Product.countDocuments(filter);

  // Get products
  const products = await Product.find(filter)
    .populate("category")
    .populate("image")
    .sort(sortOption)
    .skip((page - 1) * limit)
    .limit(limit);

  const result = [];

  for (const product of products) {
    let variants = [];

    // Only get variants for products that actually have variants
    if (product.hasVariants) {
      variants = await ProductVariant.find({
        product: product._id,
        isActive: true,
        stock: {
          $gt: 0,
        },
      }).sort({
        price: 1,
      });
    }

    result.push({
      ...product.toObject(),
      variants,
    });
  }

  const totalPages = Math.ceil(total / limit);

  const enrichedProducts = await enrichCustomerProductsWithOffers(result);

  return {
    products: enrichedProducts,

    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
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

  let variants = [];

  // Product with variants
  if (product.hasVariants) {
    variants = await ProductVariant.find({
      product: product._id,
      isActive: true,
      stock: { $gt: 0 },
    }).sort({
      price: 1,
    });
  }

  // Product without variants
  if (!product.hasVariants) {
    if (!product.stock || product.stock <= 0) {
      throw new Error("Product is out of stock.");
    }
  }

  // Product with variants but no available variants
  if (product.hasVariants && variants.length === 0) {
    throw new Error("Product is out of stock.");
  }

  const result = {
    ...product.toObject(),
    variants,
  };

  //Attach active offers to the product or its variants
  const [enrichedProduct] = await enrichCustomerProductsWithOffers([result]);

  return enrichedProduct;
};

export const searchCustomerProductsService = async ({
  q,
  page = 1,
  limit = 10,
}) => {
  page = Number(page);
  limit = Number(limit);

  if (!q || !q.trim()) {
    throw new Error("Search query is required.");
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Invalid page.");
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Invalid limit.");
  }

  const searchRegex = new RegExp(q.trim(), "i");

  const filter = {
    isActive: true,
    $or: [
      {
        name: searchRegex,
      },
      {
        description: searchRegex,
      },
    ],
  };

  const total = await Product.countDocuments(filter);

  const products = await Product.find(filter)
    .populate("category")
    .populate("image")
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalPages = Math.ceil(total / limit);

  return {
    products,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};
