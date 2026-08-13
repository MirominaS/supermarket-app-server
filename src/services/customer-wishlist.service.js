import mongoose from "mongoose";

import Wishlist from "../models/wishlist.model.js";
import Product from "../models/product.model.js";

//add product to wishlist
export const addToWishlistService = async ({ customerId, productId }) => {
  // Validate customer ID
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID.");
  }

  // Validate product ID
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID.");
  }

  // Check product
  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  });

  if (!product) {
    throw new Error("Product not found or inactive.");
  }

  // Find customer's wishlist
  let wishlist = await Wishlist.findOne({
    customer: customerId,
  });

  // Create wishlist if customer doesn't have one
  if (!wishlist) {
    wishlist = await Wishlist.create({
      customer: customerId,
      items: [
        {
          product: productId,
        },
      ],
    });

    return wishlist;
  }

  // Check whether product already exists
  const alreadyExists = wishlist.items.some(
    (item) => item.product.toString() === productId.toString(),
  );

  if (alreadyExists) {
    throw new Error("Product is already in your wishlist.");
  }

  // Add product
  wishlist.items.push({
    product: productId,
  });

  await wishlist.save();

  return wishlist;
};

//remove a product from wishlist
export const removeFromWishlistService = async ({ customerId, productId }) => {
  // Validate customer ID
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID.");
  }

  // Validate product ID
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID.");
  }

  const wishlist = await Wishlist.findOne({
    customer: customerId,
  });

  if (!wishlist) {
    throw new Error("Wishlist not found.");
  }

  const itemExists = wishlist.items.some(
    (item) => item.product.toString() === productId.toString(),
  );

  if (!itemExists) {
    throw new Error("Product is not in your wishlist.");
  }

  wishlist.items = wishlist.items.filter(
    (item) => item.product.toString() !== productId.toString(),
  );

  await wishlist.save();

  return wishlist;
};

//get wishlist
export const getWishlistService = async ({ customerId }) => {
  // Validate customer ID
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID.");
  }

  const wishlist = await Wishlist.findOne({
    customer: customerId,
  }).populate({
    path: "items.product",
    match: {
      isActive: true,
    },
  });

  if (!wishlist) {
    return {
      customer: customerId,
      items: [],
    };
  }

  // Remove inactive/deleted products from response
  const activeItems = wishlist.items.filter((item) => item.product !== null);

  return {
    _id: wishlist._id,
    customer: wishlist.customer,
    items: activeItems,
    createdAt: wishlist.createdAt,
    updatedAt: wishlist.updatedAt,
  };
};

//check the product is in wishlist or not
export const checkWishlistService = async ({ customerId, productId }) => {
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID.");
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID.");
  }

  const wishlist = await Wishlist.findOne({
    customer: customerId,
  });

  if (!wishlist) {
    return false;
  }

  return wishlist.items.some(
    (item) => item.product.toString() === productId.toString(),
  );
};
