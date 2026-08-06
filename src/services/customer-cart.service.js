import mongoose from "mongoose";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";

export const addToCartService = async ({
  customerId,
  productId,
  variantId,
  quantity,
}) => {
  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID.");
  }

  if (!mongoose.Types.ObjectId.isValid(variantId)) {
    throw new Error("Invalid variant ID.");
  }

  // Validate quantity
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be a positive integer.");
  }

  // Check product
  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  // Check variant
  const variant = await ProductVariant.findOne({
    _id: variantId,
    product: productId,
    isActive: true,
  });

  if (!variant) {
    throw new Error("Product variant not found.");
  }

  // Check stock
  if (variant.stock < quantity) {
    throw new Error(
      `Only ${variant.stock} item(s) available for ${variant.name}.`,
    );
  }

  // Find customer's cart
  let cart = await Cart.findOne({
    customer: customerId,
  });

  // Create cart if it doesn't exist
  if (!cart) {
    cart = await Cart.create({
      customer: customerId,
      items: [],
    });
  }
  const existingItem = cart.items.find(
    (item) =>
      item.product.toString() === productId &&
      item.variant.toString() === variantId,
  );

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;

    if (newQuantity > variant.stock) {
      throw new Error(
        `Only ${variant.stock} item(s) available for ${variant.name}.`,
      );
    }

    existingItem.quantity = newQuantity;
  } else {
    cart.items.push({
      product: productId,
      variant: variantId,
      quantity,
    });
  }

  await cart.save();

  return await Cart.findById(cart._id)
    .populate({
      path: "items.product",
      populate: {
        path: "image",
      },
    })
    .populate("items.variant");
};

export const getCartService = async (customerId) => {
  let cart = await Cart.findOne({
    customer: customerId,
  }).populate({
    path: "items.product",
    match: {
      isActive: true,
    },
    populate: [
      {
        path: "image",
      },
      {
        path: "category",
      },
    ],
  });

  if (!cart) {
    return {
      items: [],
      totalItems: 0,
      subtotal: 0,
    };
  }

  // Remove deleted/inactive products
  const validItems = cart.items.filter((item) => item.product && item.variant);

  let totalItems = 0;
  let subtotal = 0;

  for (const item of validItems) {
    totalItems += item.quantity;

    subtotal += item.variant.price * item.quantity;
  }

  return {
    ...cart.toObject(),
    items: validItems,
    totalItems,
    subtotal,
  };
};

export const updateCartItemService = async ({
  customerId,
  productId,
  variantId,
  quantity,
}) => {
  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID.");
  }

  if (!mongoose.Types.ObjectId.isValid(variantId)) {
    throw new Error("Invalid variant ID.");
  }

  // Validate quantity
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be a positive integer.");
  }

  // Find cart
  const cart = await Cart.findOne({
    customer: customerId,
  });

  if (!cart) {
    throw new Error("Cart not found.");
  }

  // Find cart item
  const item = cart.items.find(
    (item) =>
      item.product.toString() === productId &&
      item.variant.toString() === variantId,
  );

  if (!item) {
    throw new Error("Product variant not found in cart.");
  }

  // Validate product
  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  // Validate variant
  const variant = await ProductVariant.findOne({
    _id: variantId,
    product: productId,
    isActive: true,
  });

  if (!variant) {
    throw new Error("Product variant not found.");
  }

  // Check stock
  if (quantity > variant.stock) {
    throw new Error(
      `Only ${variant.stock} item(s) available for ${variant.name}.`,
    );
  }

  // Update quantity
  item.quantity = quantity;

  await cart.save();

  return await Cart.findById(cart._id)
    .populate({
      path: "items.product",
      populate: [
        {
          path: "category",
        },
        {
          path: "image",
        },
      ],
    })
    .populate("items.variant");
};

export const removeCartItemService = async ({
  customerId,
  productId,
  variantId,
}) => {
  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID.");
  }

  if (!mongoose.Types.ObjectId.isValid(variantId)) {
    throw new Error("Invalid variant ID.");
  }

  // Find cart
  const cart = await Cart.findOne({
    customer: customerId,
  });

  if (!cart) {
    throw new Error("Cart not found.");
  }

  // Check if the product + variant exists
  const itemExists = cart.items.some(
    (item) =>
      item.product.toString() === productId &&
      item.variant.toString() === variantId,
  );

  if (!itemExists) {
    throw new Error("Product variant not found in cart.");
  }

  // Remove only the selected variant
  cart.items = cart.items.filter(
    (item) =>
      !(
        item.product.toString() === productId &&
        item.variant.toString() === variantId
      ),
  );

  await cart.save();

  return await Cart.findById(cart._id)
    .populate({
      path: "items.product",
      populate: [
        {
          path: "category",
        },
        {
          path: "image",
        },
      ],
    })
    .populate("items.variant");
};

export const clearCartService = async (customerId) => {
  const cart = await Cart.findOne({
    customer: customerId,
  });

  if (!cart) {
    throw new Error("Cart not found.");
  }

  cart.items = [];

  await cart.save();

  return cart;
};
