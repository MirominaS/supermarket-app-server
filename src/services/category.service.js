import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import mongoose from "mongoose";
import { getCache, setCache } from "./cache.service.js";
import { categoryCacheKeys } from "../utils/category-cache-key.js";

// Helper functions
const isEmptyValue = (value) => {
  return value === null || value === undefined || String(value).trim() === "";
};

const normalizeString = (value) => {
  if (isEmptyValue(value)) {
    return "";
  }

  return String(value).trim();
};

const normalizeName = (value) => {
  return normalizeString(value).toLowerCase();
};

const parseBoolean = (value, fieldName) => {
  // Empty isActive means true
  if (isEmptyValue(value)) {
    return {
      value: true,
      error: null,
    };
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "true" || normalized === "yes") {
    return {
      value: true,
      error: null,
    };
  }

  if (normalized === "false" || normalized === "no") {
    return {
      value: false,
      error: null,
    };
  }

  return {
    value: null,
    error: `${fieldName} must be "true", "false", "yes", or "no".`,
  };
};

const isCompletelyEmptyRow = (row) => {
  if (!row || typeof row !== "object") {
    return true;
  }

  return !Object.values(row).some((value) => !isEmptyValue(value));
};

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
  const cacheKey = categoryCacheKeys.all;

  const cachedCategories = await getCache(cacheKey);

  if (cachedCategories !== null) {
    console.log(`Categories cache HIT: ${cacheKey}`);

    return cachedCategories;
  }

  console.log(`Categories cache MISS: ${cacheKey}`);

  const categories = await Category.find().sort({
    createdAt: -1,
  });

  await setCache(cacheKey, categories, 300);

  return categories;
};

export const getCategoryByIdService = async (categoryId) => {
  const cacheKey = categoryCacheKeys.byId(categoryId);

  const cachedCategory = await getCache(cacheKey);

  if (cachedCategory !== null) {
    console.log(`Category cache HIT: ${cacheKey}`);

    return cachedCategory;
  }

  console.log(`Category cache MISS: ${cacheKey}`);

  const category = await Category.findById(categoryId);

  if (!category) {
    throw new Error("Category not found.");
  }

  await setCache(cacheKey, category, 300);

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

  // Check whether products are using this category
  const productCount = await Product.countDocuments({
    category: categoryId,
  });

  if (productCount > 0) {
    throw new Error(
      `Cannot delete this category because ${productCount} product${
        productCount > 1 ? "s are" : " is"
      } assigned to it.`,
    );
  }

  await category.deleteOne();

  return {
    message: "Category deleted successfully.",
  };
};

// Categories bulk import
export const bulkImportCategoriesService = async (sheets) => {
  // Validate Excel data
  if (!sheets || typeof sheets !== "object") {
    throw new Error("Invalid Excel data.");
  }

  if (!sheets.Categories) {
    throw new Error('Excel file must contain a "Categories" sheet.');
  }

  const categoryRows = sheets.Categories;

  if (!Array.isArray(categoryRows) || categoryRows.length === 0) {
    throw new Error('"Categories" sheet is empty.');
  }

  const errors = [];

  // Remove completely empty rows
  const validCategoryRows = categoryRows.filter(
    (row) => !isCompletelyEmptyRow(row),
  );

  if (validCategoryRows.length === 0) {
    throw new Error('"Categories" sheet does not contain any category data.');
  }

  // Validate required columns

  /*
   * Required:
   *
   * name
   *
   * Optional:
   *
   * description
   * image
   * isActive
   */

  const requiredColumns = ["name"];

  const firstRow = validCategoryRows[0];

  for (const column of requiredColumns) {
    if (!(column in firstRow)) {
      errors.push({
        sheet: "Categories",
        row: 1,
        field: column,
        message: `Column "${column}" is required.`,
      });
    }
  }

  // Stop if required columns are missing
  if (errors.length > 0) {
    return {
      totalRows: validCategoryRows.length,
      successfulCategories: 0,
      failedCategories: validCategoryRows.length,
      importedCategories: [],
      errors,
    };
  }

  // Validate category rows
  const validatedCategories = [];

  const excelCategoryNames = new Set();

  for (let i = 0; i < validCategoryRows.length; i++) {
    const row = validCategoryRows[i];

    //Excel row number:
    const rowNumber = categoryRows.indexOf(row) + 2;

    //name
    const name = normalizeString(row.name);

    if (!name) {
      errors.push({
        sheet: "Categories",
        row: rowNumber,
        field: "name",
        message: "Category name is required.",
      });

      continue;
    }

    const normalizedName = normalizeName(name);

    if (excelCategoryNames.has(normalizedName)) {
      errors.push({
        sheet: "Categories",
        row: rowNumber,
        field: "name",
        message: `Duplicate category "${name}" found in Excel file.`,
      });

      continue;
    }

    excelCategoryNames.add(normalizedName);

    const description = normalizeString(row.description);

    const image = isEmptyValue(row.image) ? null : normalizeString(row.image);

    let isActive = true;

    if (!isEmptyValue(row.isActive)) {
      const activeResult = parseBoolean(row.isActive, "isActive");

      if (activeResult.error) {
        errors.push({
          sheet: "Categories",
          row: rowNumber,
          field: "isActive",
          message: activeResult.error,
        });

        continue;
      }

      isActive = activeResult.value;
    }

    validatedCategories.push({
      rowNumber,
      name,
      normalizedName,
      description,
      image,
      isActive,
    });
  }

  // Check existing categories in database
  if (validatedCategories.length > 0) {
    const categoryNames = validatedCategories.map((category) => category.name);

    const existingCategories = await Category.find({
      name: {
        $in: categoryNames,
      },
    })
      .select("_id name")
      .collation({
        locale: "en",
        strength: 2,
      })
      .lean();

    const existingCategoryNames = new Set(
      existingCategories.map((category) => normalizeName(category.name)),
    );

    for (const category of validatedCategories) {
      if (existingCategoryNames.has(category.normalizedName)) {
        errors.push({
          sheet: "Categories",
          row: category.rowNumber,
          field: "name",
          message: `Category "${category.name}" already exists.`,
        });
      }
    }
  }

  if (errors.length > 0) {
    return {
      totalRows: validCategoryRows.length,
      successfulCategories: 0,
      failedCategories: validCategoryRows.length,
      importedCategories: [],
      errors,
    };
  }

  //MongoDB transaction
  const session = await mongoose.startSession();

  try {
    let createdCategories = [];

    await session.withTransaction(async () => {
      // Prepare categories
      const categoriesToInsert = validatedCategories.map((category) => ({
        name: category.name,
        description: category.description,
        image: category.image,
        isActive: category.isActive,
      }));

      createdCategories = await Category.insertMany(categoriesToInsert, {
        session,
        ordered: true,
      });
    });

    return {
      totalRows: validCategoryRows.length,
      successfulCategories: createdCategories.length,
      failedCategories: 0,
      importedCategories: createdCategories.map((category) => ({
        id: category._id,
        name: category.name,
        description: category.description,
        image: category.image,
        isActive: category.isActive,
      })),

      errors: [],
    };
  } catch (error) {
    throw error;
  } finally {
    await session.endSession();
  }
};
