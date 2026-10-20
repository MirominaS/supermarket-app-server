import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Media from "../models/media.model.js";
import ProductVariant from "../models/product-variant.model.js";
import { getCache, setCache } from "./cache.service.js";
import { generateUniqueSlug } from "../utils/slug.util.js";
import { productCacheKeys } from "../utils/product-cache-key.js";

export const createProductService = async (productData) => {
  const category = await Category.findOne({
    _id: productData.category,
    parentCategory: null,
  });

  if (!category) {
    throw new Error("Please select a valid main category.");
  }

  let subCategory = null;

  if (
    productData.subCategory !== undefined &&
    productData.subCategory !== null &&
    productData.subCategory !== ""
  ) {
    subCategory = await Category.findOne({
      _id: productData.subCategory,
      parentCategory: category._id,
    });

    if (!subCategory) {
      throw new Error(
        "The selected subcategory does not belong to the selected main category.",
      );
    }
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

  const slug = await generateUniqueSlug(Product, productData.name);

  const hasVariants = productData.hasVariants === true;

  // If product does NOT have variants,
  // price, costPrice, stock and unit are required.
  if (!hasVariants) {
    if (productData.price === undefined || productData.price === null) {
      throw new Error("Price is required for a product without variants.");
    }

    if (productData.stock === undefined || productData.stock === null) {
      throw new Error("Stock is required for a product without variants.");
    }

    if (!productData.unit) {
      throw new Error("Unit is required for a product without variants.");
    }

    if (productData.price < 0) {
      throw new Error("Price cannot be negative.");
    }

    if (productData.stock < 0) {
      throw new Error("Stock cannot be negative.");
    }

    if (
      productData.costPrice !== undefined &&
      productData.costPrice !== null &&
      productData.costPrice < 0
    ) {
      throw new Error("Cost price cannot be negative.");
    }
  }

  let compareAtPrice = null;

  if (
    productData.compareAtPrice !== undefined &&
    productData.compareAtPrice !== null &&
    productData.compareAtPrice !== ""
  ) {
    compareAtPrice = Number(productData.compareAtPrice);

    if (!Number.isFinite(compareAtPrice) || compareAtPrice < 0) {
      throw new Error("Compare-at price must be a valid non-negative number.");
    }

    if (!hasVariants && compareAtPrice <= Number(productData.price)) {
      throw new Error(
        "Compare-at price must be greater than the selling price.",
      );
    }
  }

  const product = await Product.create({
    name: productData.name,
    brand: productData.brand?.trim() || "",
    description: productData.description,
    category: category._id,
    subCategory: subCategory?._id ?? null,
    slug,
    image: productData.image,

    hasVariants,

    price: hasVariants ? null : productData.price,
    compareAtPrice,
    costPrice: hasVariants ? null : (productData.costPrice ?? 0),
    stock: hasVariants ? null : productData.stock,
    unit: hasVariants ? null : productData.unit,
  });

  return await Product.findById(product._id)
    .populate("category")
    .populate("subCategory")
    .populate("image");
};

export const getProductsService = async () => {
  const cacheKey = productCacheKeys.all;

  const cachedProducts = await getCache(cacheKey);

  if (cachedProducts !== null) {
    console.log(`Products cache HIT: ${cacheKey}`);

    return cachedProducts;
  }

  console.log(`Products cache MISS: ${cacheKey}`);

  const products = await Product.find()
    .populate("category")
      .populate("subCategory")
    .populate("image")
    .sort({
      createdAt: -1,
    });

  const result = [];

  for (const product of products) {
    let variants = [];

    if (product.hasVariants) {
      variants = await ProductVariant.find({
        product: product._id,
        isActive: true,
      }).sort({
        createdAt: 1,
      });
    }

    result.push({
      ...product.toObject(),
      variants,
    });
  }

  await setCache(cacheKey, result, 300);

  return result;
};

export const getProductByIdService = async (productId) => {
  const cacheKey = productCacheKeys.byId(productId);

  const cachedProduct = await getCache(cacheKey);

  if (cachedProduct !== null) {
    console.log(`Product cache HIT: ${cacheKey}`);

    return cachedProduct;
  }

  console.log(`Product cache MISS: ${cacheKey}`);

  const product = await Product.findById(productId)
    .populate("category")
      .populate("subCategory")
    .populate("image");

  if (!product) {
    throw new Error("Product not found.");
  }

  let variants = [];

  if (product.hasVariants) {
    variants = await ProductVariant.find({
      product: product._id,
      isActive: true,
    }).sort({
      createdAt: 1,
    });
  }

  const result = {
    ...product.toObject(),
    variants,
  };

  await setCache(cacheKey, result, 300);

  return result;
};

export const updateProductService = async (productId, updateData) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new Error("Product not found.");
  }

  // Validate category

  const nextCategoryId = updateData.category ?? product.category;

  const nextSubCategoryId =
    updateData.subCategory !== undefined
      ? updateData.subCategory
      : product.subCategory;

  const category = await Category.findOne({
    _id: nextCategoryId,
    parentCategory: null,
  });

  if (!category) {
    throw new Error("Please select a valid main category.");
  }

  let subCategory = null;

  if (
    nextSubCategoryId !== undefined &&
    nextSubCategoryId !== null &&
    nextSubCategoryId !== ""
  ) {
    subCategory = await Category.findOne({
      _id: nextSubCategoryId,
      parentCategory: category._id,
    });

    if (!subCategory) {
      throw new Error(
        "The selected subcategory does not belong to the selected main category.",
      );
    }
  }

  if (updateData.brand !== undefined) {
    product.brand = String(updateData.brand).trim();
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

  // Do not allow changing hasVariants here
  if (updateData.hasVariants !== undefined) {
    throw new Error("Product variant type cannot be changed after creation.");
  }

  // Basic fields
  if (updateData.name !== undefined) {
    const name = String(updateData.name).trim();

    if (!name) {
      throw new Error("Product name is required.");
    }

    product.name = name;

    product.slug = await generateUniqueSlug(Product, name, product._id);
  }

  if (updateData.brand !== undefined) {
    product.brand = String(updateData.brand ?? "").trim();
  }
  product.description = updateData.description ?? product.description;
  product.category = category._id;
  product.subCategory = subCategory?._id ?? null;
  product.image = updateData.image ?? product.image;
  // Update active status
  if (typeof updateData.isActive === "boolean") {
    product.isActive = updateData.isActive;
  }

  // PRODUCTS WITHOUT VARIANTS
  if (!product.hasVariants) {
    if (updateData.price !== undefined && updateData.price !== null) {
      if (updateData.price < 0) {
        throw new Error("Price cannot be negative.");
      }

      product.price = updateData.price;
    }

    if (updateData.costPrice !== undefined && updateData.costPrice !== null) {
      if (updateData.costPrice < 0) {
        throw new Error("Cost price cannot be negative.");
      }

      product.costPrice = updateData.costPrice;
    }

    if (updateData.stock !== undefined && updateData.stock !== null) {
      if (updateData.stock < 0) {
        throw new Error("Stock cannot be negative.");
      }

      product.stock = updateData.stock;
    }

    if (updateData.unit !== undefined) {
      const unit = updateData.unit.trim();

      if (!unit) {
        throw new Error("Unit is required.");
      }

      product.unit = unit;
    }
  }

  // PRODUCTS WITH VARIANT
  if (product.hasVariants) {
    if (
      updateData.price !== undefined ||
      updateData.costPrice !== undefined ||
      updateData.stock !== undefined ||
      updateData.unit !== undefined
    ) {
      throw new Error(
        "Price, cost price, stock and unit must be managed through product variants.",
      );
    }
  }

  if (updateData.compareAtPrice !== undefined) {
    if (
      updateData.compareAtPrice === null ||
      updateData.compareAtPrice === ""
    ) {
      product.compareAtPrice = null;
    } else {
      const compareAtPrice = Number(updateData.compareAtPrice);

      if (!Number.isFinite(compareAtPrice) || compareAtPrice < 0) {
        throw new Error(
          "Compare-at price must be a valid non-negative number.",
        );
      }

      product.compareAtPrice = compareAtPrice;
    }
  }

  // Validate the final selling price and compare-at price together.
  if (
    !product.hasVariants &&
    product.compareAtPrice !== null &&
    product.compareAtPrice !== undefined &&
    product.price !== null &&
    product.compareAtPrice <= product.price
  ) {
    throw new Error("Compare-at price must be greater than the selling price.");
  }

  await product.save();

  return await Product.findById(product._id)
    .populate("category")
      .populate("subCategory")
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
