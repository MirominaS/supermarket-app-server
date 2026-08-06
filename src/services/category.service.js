import Category from "../models/category.model.js";

export const createCategoryService = async (categoryData) => {
  const existingCategory = await Category.findOne({
    name: categoryData.name,
  });

  if (existingCategory) {
    throw new Error("Category already exists.");
  }

  const category = await Category.create(categoryData);

  return category;
};

export const getCategoriesService = async () => {
  return await Category.find().sort({ createdAt: -1 });
};

export const getCategoryByIdService = async (categoryId) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new Error("Category not found.");
  }

  return category;
};

export const updateCategoryService = async (categoryId, updateData) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new Error("Category not found.");
  }

  if (updateData.name) {
    const existingCategory = await Category.findOne({
      name: updateData.name,
      _id: { $ne: categoryId },
    });

    if (existingCategory) {
      throw new Error("Category already exists.");
    }
  }

  Object.assign(category, updateData);

  await category.save();

  return category;
};

export const deleteCategoryService = async (categoryId) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new Error("Category not found.");
  }

  await category.deleteOne();

  return category;
};
