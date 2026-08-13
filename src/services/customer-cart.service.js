import mongoose from "mongoose";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";

const getCartOwnerQuery = ({ customerId, guestId }) => {
  if (!customerId && !guestId) {
    throw new Error("Customer ID or Guest ID is required.");
  }

  if (customerId && guestId) {
    throw new Error("Cart cannot belong to both customer and guest.");
  }

  if (customerId) {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      throw new Error("Invalid customer ID.");
    }

    return {
      customer: customerId,
    };
  }

  return {
    guestId,
  };
};

export const addToCartService = async ({
  customerId,
  guestId,
  productId,
  variantId,
  quantity,
}) => {
  // Validate cart owner
  const cartOwnerQuery = getCartOwnerQuery({
    customerId,
    guestId,
  });

  // Validate product ID
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID.");
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

  let variant = null;

  // Product has a variant
  if (variantId) {
    // Validate variant ID
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      throw new Error("Invalid variant ID.");
    }

    // Check variant
    variant = await ProductVariant.findOne({
      _id: variantId,
      product: productId,
      isActive: true,
    });

    if (!variant) {
      throw new Error("Product variant not found.");
    }

    // Check variant stock
    if (variant.stock < quantity) {
      throw new Error(
        `Only ${variant.stock} item(s) available for ${variant.name}.`,
      );
    }
  } else {
    // Product does not have a variant
    if (product.hasVariants) {
      throw new Error("Variant ID is required for this product.");
    }

    // Check product stock
    if (product.stock < quantity) {
      throw new Error(
        `Only ${product.stock} item(s) available for ${product.name}.`,
      );
    }
  }

  // Find customer's or guest's cart
  let cart = await Cart.findOne(cartOwnerQuery);

  // Create cart if it doesn't exist
  if (!cart) {
    cart = await Cart.create({
      ...(customerId ? { customer: customerId } : {}),
      ...(guestId ? { guestId } : {}),
      items: [],
    });
  }

  // Check whether product + variant already exists
  const existingItem = cart.items.find((item) => {
    const sameProduct = item.product.toString() === productId;

    const sameVariant = variantId
      ? item.variant?.toString() === variantId
      : !item.variant;

    return sameProduct && sameVariant;
  });

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;

    const availableStock = variant ? variant.stock : product.stock;

    if (newQuantity > availableStock) {
      throw new Error(`Only ${availableStock} item(s) available.`);
    }

    existingItem.quantity = newQuantity;
  } else {
    cart.items.push({
      product: productId,
      variant: variantId || null,
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

export const getCartService = async ({ customerId, guestId }) => {
  const cartOwnerQuery = getCartOwnerQuery({
    customerId,
    guestId,
  });

  const cart = await Cart.findOne(cartOwnerQuery)
    .populate({
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
    })
    .populate("items.variant");

  if (!cart) {
    return {
      items: [],
      totalItems: 0,
      subtotal: 0,
    };
  }

  // Remove deleted/inactive products
  const validItems = cart.items.filter(
    (item) => item.product && (item.variant || item.variant === null),
  );

  let totalItems = 0;
  let subtotal = 0;

  for (const item of validItems) {
    totalItems += item.quantity;

    if (item.variant) {
      subtotal += item.variant.price * item.quantity;
    } else {
      subtotal += item.product.price * item.quantity;
    }
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
  guestId,
  productId,
  variantId,
  quantity,
}) => {
  const cartOwnerQuery = getCartOwnerQuery({
    customerId,
    guestId,
  });

  // Validate product ID
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID.");
  }

  // Validate quantity
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be a positive integer.");
  }

  // If variantId exists, validate it
  if (
    variantId &&
    !mongoose.Types.ObjectId.isValid(variantId)
  ) {
    throw new Error("Invalid variant ID.");
  }

  // Find cart
  const cart = await Cart.findOne(cartOwnerQuery);

  if (!cart) {
    throw new Error("Cart not found.");
  }

  // Find cart item
  const item = cart.items.find((item) => {
    const sameProduct =
      item.product.toString() === productId;

    const sameVariant = variantId
      ? item.variant?.toString() === variantId
      : !item.variant;

    return sameProduct && sameVariant;
  });

  if (!item) {
    throw new Error("Product not found in cart.");
  }

  // Validate product
  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  let variant = null;

  // Product has variant
  if (variantId) {
    variant = await ProductVariant.findOne({
      _id: variantId,
      product: productId,
      isActive: true,
    });

    if (!variant) {
      throw new Error("Product variant not found.");
    }
  }

  // Determine available stock
  const availableStock = variant
    ? variant.stock
    : product.stock;

  // Check stock
  if (quantity > availableStock) {
    throw new Error(
      `Only ${availableStock} item(s) available.`,
    );
  }

  // Update quantity
  item.quantity = quantity;

  await cart.save();

  // Return updated cart
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
  guestId,
  productId,
  variantId,
}) => {
  const cartOwnerQuery = getCartOwnerQuery({
    customerId,
    guestId,
  });

  // Validate product ID
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID.");
  }

  // If variantId exists, validate it
  if (
    variantId &&
    !mongoose.Types.ObjectId.isValid(variantId)
  ) {
    throw new Error("Invalid variant ID.");
  }

  // Find cart
  const cart = await Cart.findOne(cartOwnerQuery);

  if (!cart) {
    throw new Error("Cart not found.");
  }

  // Find cart item
  const itemExists = cart.items.some((item) => {
    const sameProduct =
      item.product.toString() === productId;

    const sameVariant = variantId
      ? item.variant?.toString() === variantId
      : !item.variant;

    return sameProduct && sameVariant;
  });

  if (!itemExists) {
    throw new Error("Product not found in cart.");
  }

  // Remove item
  cart.items = cart.items.filter((item) => {
    const sameProduct =
      item.product.toString() === productId;

    const sameVariant = variantId
      ? item.variant?.toString() === variantId
      : !item.variant;

    return !(sameProduct && sameVariant);
  });

  await cart.save();

  // Return updated cart
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

export const clearCartService = async ({ customerId, guestId }) => {
  const cartOwnerQuery = getCartOwnerQuery({
    customerId,
    guestId,
  });

  const cart = await Cart.findOne(cartOwnerQuery);

  if (!cart) {
    throw new Error("Cart not found.");
  }

  cart.items = [];

  await cart.save();

  return cart;
};
