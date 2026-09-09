import {
  getCustomerCategoriesService,
  getCustomerCategoryByIdService,
  searchCustomerCategoriesService,
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
    const category = await getCustomerCategoryByIdService(req.params.id);

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

export const searchCustomerCategories = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query is required.",
      });
    }

    const categories = await searchCustomerCategoriesService(q.trim());

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to search categories.",
    });
  }
};
