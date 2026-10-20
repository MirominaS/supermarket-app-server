import Category from "../models/category.model.js";

export const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const getCustomerCategoriesService = async () => {
  return Category.find({
    isActive: true,
    parentCategory: null,
  })
    .select("name slug description image")
    .sort({ name: 1 })
    .lean();
};

export const getCustomerCategoryByIdService = async (categoryId) => {
  const category = await Category.findOne({
    _id: categoryId,
    isActive: true,
    parentCategory: null,
  })
    .select("name slug description image")
    .lean();

  if (!category) {
    throw new Error("Category not found.");
  }

  category.subCategories = await Category.find({
    parentCategory: category._id,
    isActive: true,
  })
    .select("name slug description image parentCategory")
    .sort({ name: 1 })
    .lean();

  return category;
};

export const getCustomerCategoryBySlugService = async (slug) => {
  const normalizedSlug = String(slug || "")
    .trim()
    .toLowerCase();

  if (!normalizedSlug) {
    throw new Error("Category slug is required.");
  }

  const category = await Category.findOne({
    slug: normalizedSlug,
    isActive: true,
  }).select("name slug description image");

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
    .select("name slug description image")
    .sort({ name: 1 });
};
