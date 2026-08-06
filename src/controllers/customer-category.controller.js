import {
  getCustomerCategoriesService,
  getCustomerCategoryByIdService,
} from "../services/customer-category.service.js";

export const getCustomerCategories = async (req, res) => {
  try {
    const categories = await getCustomerCategoriesService();

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories.",
    });
  }
};

export const getCustomerCategoryById = async (req, res) => {
  try {
    const category = await getCustomerCategoryByIdService(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error(error);

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};