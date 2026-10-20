import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import mongoose from "mongoose";
import { getCache, setCache, deleteCache } from "./cache.service.js";
import { categoryCacheKeys } from "../utils/category-cache-key.js";
import { generateUniqueSlug } from "../utils/slug.util.js";

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

const invalidateCategoryCache = async ({ id, oldSlug, newSlug } = {}) => {
  const keys = [categoryCacheKeys.all];

  if (id) {
    keys.push(categoryCacheKeys.byId(id));
  }

  if (oldSlug) {
    keys.push(categoryCacheKeys.bySlug(oldSlug));
  }

  if (newSlug) {
    keys.push(categoryCacheKeys.bySlug(newSlug));
  }

  await Promise.all(keys.map((key) => deleteCache(key)));
};

const normalizeParentCategory = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const id = String(value).trim();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid parent category ID.");
  }

  return id;
};

const validateParentCategory = async (parentCategoryId, currentId = null) => {
  if (!parentCategoryId) {
    return null;
  }

  if (currentId && String(parentCategoryId) === String(currentId)) {
    throw new Error("A category cannot be its own parent.");
  }

  const parent = await Category.findById(parentCategoryId);

  if (!parent) {
    throw new Error("Parent category not found.");
  }

  if (parent.parentCategory) {
    throw new Error(
      "A subcategory cannot be used as a parent. Select a main category.",
    );
  }

  return parent._id;
};

export const createCategoryService = async (categoryData) => {
  const name = String(categoryData.name || "").trim();

  if (!name) {
    throw new Error("Category name is required.");
  }

  const parentCategoryId = normalizeParentCategory(categoryData.parentCategory);

  const parentCategory = await validateParentCategory(parentCategoryId);

  const existingCategory = await Category.findOne({ name }).collation({
    locale: "en",
    strength: 2,
  });

  if (existingCategory) {
    throw new Error("Category already exists.");
  }

  const slug = await generateUniqueSlug(Category, name);

  const category = await Category.create({
    name,
    slug,
    description: categoryData.description,
    image: categoryData.image,
    isActive: categoryData.isActive ?? true,
    parentCategory,
  });

  await invalidateCategoryCache({
    id: category._id.toString(),
    newSlug: category.slug,
  });

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


export const getCategoryTreeService = async () => {
  const mainCategories = await Category.find({
    parentCategory: null,
  })
    .sort({ name: 1 })
    .lean();

  const subCategories = await Category.find({
    parentCategory: { $ne: null },
  })
    .sort({ name: 1 })
    .lean();

  const subCategoriesByParent = new Map();

  for (const subCategory of subCategories) {
    const parentId = String(subCategory.parentCategory);

    if (!subCategoriesByParent.has(parentId)) {
      subCategoriesByParent.set(parentId, []);
    }

    subCategoriesByParent.get(parentId).push(subCategory);
  }

  return mainCategories.map((category) => ({
    ...category,
    subCategories:
      subCategoriesByParent.get(String(category._id)) || [],
  }));
};

export const updateCategoryService = async (categoryId, updateData) => {
  const oldSlug = category.slug;
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new Error("Category not found.");
  }

  if (updateData.name !== undefined) {
    const name = String(updateData.name).trim();

    if (!name) {
      throw new Error("Category name is required.");
    }

    const existingCategory = await Category.findOne({
      name,
      _id: { $ne: categoryId },
    }).collation({
      locale: "en",
      strength: 2,
    });

    if (existingCategory) {
      throw new Error("Category already exists.");
    }

    category.name = name;
    category.slug = await generateUniqueSlug(Category, name, category._id);
  }

  if (updateData.description !== undefined) {
    category.description = updateData.description;
  }

  if (updateData.image !== undefined) {
    category.image = updateData.image;
  }

  if (typeof updateData.isActive === "boolean") {
    category.isActive = updateData.isActive;
  }

  if (updateData.parentCategory !== undefined) {
    const parentCategoryId = normalizeParentCategory(updateData.parentCategory);

    category.parentCategory = await validateParentCategory(
      parentCategoryId,
      category._id,
    );
  }

  await category.save();

  await invalidateCategoryCache({
    id: category._id.toString(),
    oldSlug,
    newSlug: category.slug,
  });

  return category;
};

export const deleteCategoryService = async (categoryId) => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new Error("Invalid category ID.");
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    throw new Error("Category not found.");
  }

  const subCategoryCount = await Category.countDocuments({
    parentCategory: category._id,
  });

  if (subCategoryCount > 0) {
    throw new Error(
      `Cannot delete this category because it has ${subCategoryCount} subcategory/subcategories. Delete or move them first.`,
    );
  }

  // Check existing product references.
  const productCount = await Product.countDocuments({
    $or: [{ category: category._id }, { subCategory: category._id }],
  });

  if (productCount > 0) {
    throw new Error(
      `Cannot delete this category because ${productCount} product(s) use it.`,
    );
  }

  const oldSlug = category.slug;
  const id = category._id.toString();

  await category.deleteOne();

  await invalidateCategoryCache({
    id,
    oldSlug,
  });

  return category;
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

      // Prepare categories with unique slugs
      const categoriesToInsert = [];
      const generatedSlugs = new Set();

      for (const category of validatedCategories) {
        let slug = await generateUniqueSlug(Category, category.name);

        // Also prevent duplicate slugs within this Excel import.
        const baseSlug = slug;
        let counter = 2;

        while (generatedSlugs.has(slug)) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        generatedSlugs.add(slug);

        categoriesToInsert.push({
          name: category.name,
          slug,
          description: category.description,
          image: category.image,
          isActive: category.isActive,
        });
      }

      createdCategories = await Category.insertMany(categoriesToInsert, {
        session,
        ordered: true,
      });
    });

    await deleteCache(categoryCacheKeys.all);

    return {
      totalRows: validCategoryRows.length,
      successfulCategories: createdCategories.length,
      failedCategories: 0,
      importedCategories: createdCategories.map((category) => ({
        id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        isActive: category.isActive,
      })),
      errors: [],
    };
  } finally {
    await session.endSession();
  }
};
