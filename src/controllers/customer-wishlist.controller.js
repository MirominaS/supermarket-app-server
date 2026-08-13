import {
  addToWishlistService,
  getWishlistService,
  removeFromWishlistService,
  checkWishlistService,
} from "../services/customer-wishlist.service.js";

// ADD TO WISHLIST
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required.",
      });
    }

    const wishlist = await addToWishlistService({
      customerId: req.user._id,
      productId,
    });

    return res.status(200).json({
      success: true,
      message: "Product added to wishlist successfully.",
      wishlist,
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET WISHLIST
export const getWishlist = async (req, res) => {
  try {
    const wishlist = await getWishlistService({
      customerId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      wishlist,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// REMOVE FROM WISHLIST
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await removeFromWishlistService({
      customerId: req.user._id,
      productId,
    });

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist successfully.",
      wishlist,
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// CHECK WISHLIST
export const checkWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const isWishlisted = await checkWishlistService({
      customerId: req.user._id,
      productId,
    });

    return res.status(200).json({
      success: true,
      isWishlisted,
    });
  } catch (error) {
    console.error("Check wishlist error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};