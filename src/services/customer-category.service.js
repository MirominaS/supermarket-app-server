import Category from "../models/category.model.js";

export const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const getCustomerCategoriesService = async () => {
  return await Category.find({
    isActive: true,
  })
    .select("name description image")
    .sort({ name: 1 });
};

export const getCustomerCategoryByIdService = async (categoryId) => {
  const category = await Category.findOne({
    _id: categoryId,
    isActive: true,
  }).select("name description image");

  if (!category) {
    throw new Error("Category not found.");
  }

  return category;
};

export const searchCustomerCategoriesService = async (search) => {
  const escapedSearch = escapeRegex(search);
  const searchRegex = new RegExp(escapedSearch, "i");

  return await Category.find({
    isActive: true,
    $or: [{ name: searchRegex }, { description: searchRegex }],
  })
    .select("name description image")
    .sort({ name: 1 });
};
