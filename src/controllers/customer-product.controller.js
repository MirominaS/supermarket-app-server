import {
  getCustomerProductsService,
  getCustomerProductByIdService,
  getCustomerProductBySlugService,
  searchCustomerProductsService,
  getCustomerBrandsService,
} from "../services/customer-product.service.js";

export const getCustomerProducts = async (req, res) => {
  try {
    const result = await getCustomerProductsService(req.query);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCustomerProductById = async (req, res) => {
  try {
    const product = await getCustomerProductByIdService(req.params.id);

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCustomerProductBySlug = async (req, res) => {
  try {
    const product = await getCustomerProductBySlugService(req.params.slug);

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

export const searchCustomerProducts = async (req, res) => {
  try {
    const result = await searchCustomerProductsService(req.query);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCustomerBrands = async (req, res) => {
  try {
    const brands = await getCustomerBrandsService();

    return res.status(200).json({
      success: true,
      count: brands.length,
      brands,
    });
  } catch (error) {
    console.error("Get customer brands error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch brands.",
    });
  }
};