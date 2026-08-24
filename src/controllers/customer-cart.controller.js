import {
  addToCartService,
  getCartService,
  updateCartItemService,
  removeCartItemService,
  clearCartService,
} from "../services/customer-cart.service.js";

// ADD TO CART
export const addToCart = async (req, res) => {
  try {
    const { productId, variantId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Product ID and quantity are required.",
      });
    }

    const cart = await addToCartService({
      customerId: req.user._id,
      productId,
      variantId: variantId || null,
      quantity: Number(quantity),
    });

    return res.status(200).json({
      success: true,
      message: "Product added to cart successfully.",
      cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET CART
export const getCart = async (req, res) => {
  try {
    const cart = await getCartService({
      customerId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Get cart error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE CART ITEM
export const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;

    const { productId, variantId } = req.params;

    if (quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Quantity is required.",
      });
    }

    const cart = await updateCartItemService({
      customerId: req.user._id,
      productId,
      variantId: variantId || null,
      quantity: Number(quantity),
    });

    return res.status(200).json({
      success: true,
      message: "Cart updated successfully.",
      cart,
    });
  } catch (error) {
    console.error("Update cart error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// REMOVE CART ITEM
export const removeCartItem = async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    const cart = await removeCartItemService({
      customerId: req.user._id,
      productId,
      variantId: variantId || null,
    });

    return res.status(200).json({
      success: true,
      message: "Item removed from cart successfully.",
      cart,
    });
  } catch (error) {
    console.error("Remove cart item error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// CLEAR CART
export const clearCart = async (req, res) => {
  try {
    await clearCartService({
      customerId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully.",
    });
  } catch (error) {
    console.error("Clear cart error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
