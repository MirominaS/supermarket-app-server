import {
  getCustomerProductsService,
  getCustomerProductByIdService,
  searchCustomerProductsService,
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
