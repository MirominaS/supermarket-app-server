import mongoose from "mongoose";

import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";
import Category from "../models/category.model.js";
import { generateUniqueSlug } from "../utils/slug.util.js";
import { deleteCache } from "./cache.service.js";
import { productCacheKeys } from "../utils/product-cache-key.js";

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

const parseNumber = (
  value,
  fieldName,
  { required = false, defaultValue = null, allowZero = true } = {},
) => {
  if (isEmptyValue(value)) {
    if (required) {
      return {
        value: null,
        error: `${fieldName} is required.`,
      };
    }

    return {
      value: defaultValue,
      error: null,
    };
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return {
      value: null,
      error: `${fieldName} must be a valid number.`,
    };
  }

  if (number < 0) {
    return {
      value: null,
      error: `${fieldName} cannot be negative.`,
    };
  }

  if (!allowZero && number === 0) {
    return {
      value: null,
      error: `${fieldName} must be greater than zero.`,
    };
  }

  return {
    value: number,
    error: null,
  };
};

const isCompletelyEmptyRow = (row) => {
  if (!row || typeof row !== "object") {
    return true;
  }

  return !Object.values(row).some((value) => !isEmptyValue(value));
};

// bulk import
export const bulkImportProductsAndVariantsService = async (sheets) => {
  //validate
  if (!sheets || typeof sheets !== "object") {
    throw new Error("Invalid Excel data.");
  }

  if (!sheets.Products) {
    throw new Error('Excel file must contain a "Products" sheet.');
  }

  if (!sheets.Variants) {
    throw new Error('Excel file must contain a "Variants" sheet.');
  }

  const productRows = sheets.Products;
  const variantRows = sheets.Variants;

  if (!Array.isArray(productRows) || productRows.length === 0) {
    throw new Error('"Products" sheet is empty.');
  }

  if (!Array.isArray(variantRows)) {
    throw new Error('Invalid "Variants" sheet data.');
  }
  const errors = [];

  // Remove empty rows
  const validProductRows = productRows.filter(
    (row) => !isCompletelyEmptyRow(row),
  );

  const validVariantRows = variantRows.filter(
    (row) => !isCompletelyEmptyRow(row),
  );

  if (validProductRows.length === 0) {
    throw new Error('"Products" sheet does not contain any product data.');
  }

  // Validate Products columns
  const requiredProductColumns = ["name", "category", "hasVariants"];

  const firstProductRow = validProductRows[0];

  for (const column of requiredProductColumns) {
    if (!(column in firstProductRow)) {
      errors.push({
        sheet: "Products",
        row: 1,
        field: column,
        message: `Column "${column}" is required.`,
      });
    }
  }

  // Validate Variants columns
  const requiredVariantColumns = [
    "productName",
    "name",
    "sku",
    "price",
    "stock",
    "unit",
  ];

  if (validVariantRows.length > 0) {
    const firstVariantRow = validVariantRows[0];

    for (const column of requiredVariantColumns) {
      if (!(column in firstVariantRow)) {
        errors.push({
          sheet: "Variants",
          row: 1,
          field: column,
          message: `Column "${column}" is required.`,
        });
      }
    }
  }

  // Stop if required columns are missing
  if (errors.length > 0) {
    return {
      totalProductRows: validProductRows.length,
      totalVariantRows: validVariantRows.length,

      successfulProducts: 0,
      successfulVariants: 0,

      failedProducts: validProductRows.length,
      failedVariants: validVariantRows.length,

      importedProducts: [],
      importedVariants: [],

      errors,
    };
  }

  // Load categories
  const categories = await Category.find({}).select("_id name").lean();

  const categoryMap = new Map();

  for (const category of categories) {
    const key = normalizeName(category.name);

    categoryMap.set(key, category._id);
  }

  // Validate Products
  const validatedProducts = [];

  // Product names appearing in Excel
  const excelProductNames = new Set();

  // Track whether a product has variants
  const productVariantStatusMap = new Map();

  for (let i = 0; i < validProductRows.length; i++) {
    const row = validProductRows[i];

    const rowNumber = productRows.indexOf(row) + 2;

    const name = normalizeString(row.name);

    const description = normalizeString(row.description);

    const categoryName = normalizeString(row.category);

    //name
    if (!name) {
      errors.push({
        sheet: "Products",
        row: rowNumber,
        field: "name",
        message: "Product name is required.",
      });

      continue;
    }

    const normalizedProductName = normalizeName(name);

    // Duplicate product names inside Excel
    if (excelProductNames.has(normalizedProductName)) {
      errors.push({
        sheet: "Products",
        row: rowNumber,
        field: "name",
        message: `Duplicate product "${name}" found in Excel file.`,
      });

      continue;
    }

    excelProductNames.add(normalizedProductName);

    //category
    if (!categoryName) {
      errors.push({
        sheet: "Products",
        row: rowNumber,
        field: "category",
        message: "Category is required.",
      });

      continue;
    }

    const categoryId = categoryMap.get(normalizeName(categoryName));

    if (!categoryId) {
      errors.push({
        sheet: "Products",
        row: rowNumber,
        field: "category",
        message: `Category "${categoryName}" not found.`,
      });

      continue;
    }

    //has variant
    const hasVariantsResult = parseBoolean(row.hasVariants, "hasVariants");

    if (hasVariantsResult.error) {
      errors.push({
        sheet: "Products",
        row: rowNumber,
        field: "hasVariants",
        message: hasVariantsResult.error,
      });

      continue;
    }

    const hasVariants = hasVariantsResult.value;

    productVariantStatusMap.set(normalizedProductName, hasVariants);

    let price = null;
    let costPrice = null;
    let stock = null;
    let unit = null;

    //product without variant
    if (!hasVariants) {
      const priceResult = parseNumber(row.price, "Price", {
        required: true,
      });

      if (priceResult.error) {
        errors.push({
          sheet: "Products",
          row: rowNumber,
          field: "price",
          message: "Price is required for a product without variants.",
        });

        continue;
      }

      price = priceResult.value;

      const costPriceResult = parseNumber(row.costPrice, "Cost price", {
        required: false,
        defaultValue: 0,
      });

      if (costPriceResult.error) {
        errors.push({
          sheet: "Products",
          row: rowNumber,
          field: "costPrice",
          message: costPriceResult.error,
        });

        continue;
      }

      costPrice = costPriceResult.value;

      const stockResult = parseNumber(row.stock, "Stock", {
        required: true,
      });

      if (stockResult.error) {
        errors.push({
          sheet: "Products",
          row: rowNumber,
          field: "stock",
          message: "Stock is required for a product without variants.",
        });

        continue;
      }

      stock = stockResult.value;

      unit = normalizeString(row.unit);

      if (!unit) {
        errors.push({
          sheet: "Products",
          row: rowNumber,
          field: "unit",
          message: "Unit is required for a product without variants.",
        });

        continue;
      }
    }

    // product with variants
    if (hasVariants) {
      const fieldsThatMustBeEmpty = ["price", "costPrice", "stock", "unit"];

      let invalidVariantProductFields = false;

      for (const field of fieldsThatMustBeEmpty) {
        if (!isEmptyValue(row[field])) {
          errors.push({
            sheet: "Products",
            row: rowNumber,
            field,
            message:
              `${field} must be empty when hasVariants is true. ` +
              "Manage this value through the Variants sheet.",
          });

          invalidVariantProductFields = true;
        }
      }

      if (invalidVariantProductFields) {
        continue;
      }

      price = null;
      costPrice = null;
      stock = null;
      unit = null;
    }

    let isActive = true;

    if (!isEmptyValue(row.isActive)) {
      const activeResult = parseBoolean(row.isActive, "isActive");

      if (activeResult.error) {
        errors.push({
          sheet: "Products",
          row: rowNumber,
          field: "isActive",
          message: activeResult.error,
        });

        continue;
      }

      isActive = activeResult.value;
    }

    validatedProducts.push({
      rowNumber,
      name,
      normalizedName: normalizedProductName,
      description,
      category: categoryId,
      hasVariants,
      price,
      costPrice,
      stock,
      unit,
      isActive,
    });
  }

  const validatedVariants = [];

  const skuSet = new Set();
  const barcodeSet = new Set();

  // product -> number of variants
  const variantCountMap = new Map();

  // product -> explicitly selected default variant
  const defaultVariantMap = new Map();

  for (let i = 0; i < validVariantRows.length; i++) {
    const row = validVariantRows[i];

    const rowNumber = variantRows.indexOf(row) + 2;

    const productName = normalizeString(row.productName);

    const normalizedProductName = normalizeName(productName);

    const name = normalizeString(row.name);

    const normalizedVariantName = normalizeName(name);

    const sku = normalizeString(row.sku).toUpperCase();

    const barcode = normalizeString(row.barcode);

    if (!productName) {
      errors.push({
        sheet: "Variants",
        row: rowNumber,
        field: "productName",
        message: "Product name is required.",
      });

      continue;
    }

    if (!excelProductNames.has(normalizedProductName)) {
      errors.push({
        sheet: "Variants",
        row: rowNumber,
        field: "productName",
        message: `Product "${productName}" does not exist in the Products sheet.`,
      });

      continue;
    }

    const hasVariants = productVariantStatusMap.get(normalizedProductName);

    if (!hasVariants) {
      errors.push({
        sheet: "Variants",
        row: rowNumber,
        field: "productName",
        message: `Product "${productName}" hasVariants=false and cannot have variants.`,
      });

      continue;
    }

    if (!name) {
      errors.push({
        sheet: "Variants",
        row: rowNumber,
        field: "name",
        message: "Variant name is required.",
      });

      continue;
    }

    if (!sku) {
      errors.push({
        sheet: "Variants",
        row: rowNumber,
        field: "sku",
        message: "SKU is required.",
      });

      continue;
    }

    if (skuSet.has(sku)) {
      errors.push({
        sheet: "Variants",
        row: rowNumber,
        field: "sku",
        message: `Duplicate SKU "${sku}" found in Excel file.`,
      });

      continue;
    }

    skuSet.add(sku);

    if (barcode) {
      if (barcodeSet.has(barcode)) {
        errors.push({
          sheet: "Variants",
          row: rowNumber,
          field: "barcode",
          message: `Duplicate barcode "${barcode}" found in Excel file.`,
        });

        continue;
      }

      barcodeSet.add(barcode);
    }

    const priceResult = parseNumber(row.price, "Price", {
      required: true,
    });

    if (priceResult.error) {
      errors.push({
        sheet: "Variants",
        row: rowNumber,
        field: "price",
        message: priceResult.error,
      });

      continue;
    }

    const price = priceResult.value;

    const costPriceResult = parseNumber(row.costPrice, "Cost price", {
      required: false,
      defaultValue: 0,
    });

    if (costPriceResult.error) {
      errors.push({
        sheet: "Variants",
        row: rowNumber,
        field: "costPrice",
        message: costPriceResult.error,
      });

      continue;
    }

    const costPrice = costPriceResult.value;

    const stockResult = parseNumber(row.stock, "Stock", {
      required: true,
    });

    if (stockResult.error) {
      errors.push({
        sheet: "Variants",
        row: rowNumber,
        field: "stock",
        message: "Stock is required.",
      });

      continue;
    }

    const stock = stockResult.value;

    const unit = normalizeString(row.unit);

    if (!unit) {
      errors.push({
        sheet: "Variants",
        row: rowNumber,
        field: "unit",
        message: "Unit is required.",
      });

      continue;
    }

    let isDefault = false;

    if (!isEmptyValue(row.isDefault)) {
      const defaultResult = parseBoolean(row.isDefault, "isDefault");

      if (defaultResult.error) {
        errors.push({
          sheet: "Variants",
          row: rowNumber,
          field: "isDefault",
          message: defaultResult.error,
        });

        continue;
      }

      isDefault = defaultResult.value;
    }

    let isActive = true;

    if (!isEmptyValue(row.isActive)) {
      const activeResult = parseBoolean(row.isActive, "isActive");

      if (activeResult.error) {
        errors.push({
          sheet: "Variants",
          row: rowNumber,
          field: "isActive",
          message: activeResult.error,
        });

        continue;
      }

      isActive = activeResult.value;
    }

    const currentCount = variantCountMap.get(normalizedProductName) || 0;

    variantCountMap.set(normalizedProductName, currentCount + 1);

    if (isDefault) {
      if (defaultVariantMap.has(normalizedProductName)) {
        errors.push({
          sheet: "Variants",
          row: rowNumber,
          field: "isDefault",
          message: `Product "${productName}" can have only one default variant.`,
        });

        continue;
      }

      defaultVariantMap.set(normalizedProductName, true);
    }

    validatedVariants.push({
      rowNumber,
      productName,
      normalizedProductName,
      name,
      normalizedVariantName,
      sku,
      barcode: barcode || null,
      price,
      costPrice,
      stock,
      unit,

      isDefault,
      isActive,
    });
  }

  // Every hasVariants=true product must have a variant
  for (const product of validatedProducts) {
    if (!product.hasVariants) {
      continue;
    }

    const variantCount = variantCountMap.get(product.normalizedName) || 0;

    if (variantCount === 0) {
      errors.push({
        sheet: "Products",
        row: product.rowNumber,
        field: "hasVariants",
        message: `Product "${product.name}" hasVariants=true but no variants were provided in the Variants sheet.`,
      });
    }
  }

  const variantNameSet = new Set();

  for (const variant of validatedVariants) {
    const key = `${variant.normalizedProductName}:${variant.normalizedVariantName}`;

    if (variantNameSet.has(key)) {
      errors.push({
        sheet: "Variants",
        row: variant.rowNumber,
        field: "name",
        message: `Variant "${variant.name}" is duplicated for product "${variant.productName}" in the Excel file.`,
      });

      continue;
    }

    variantNameSet.add(key);
  }

  // Check existing products in database
  if (validatedProducts.length > 0) {
    const productNames = validatedProducts.map((product) => product.name);

    const existingProducts = await Product.find({
      name: {
        $in: productNames,
      },
    })
      .select("_id name")
      .collation({
        locale: "en",
        strength: 2,
      })
      .lean();

    const existingProductNames = new Set(
      existingProducts.map((product) => normalizeName(product.name)),
    );

    for (const product of validatedProducts) {
      if (existingProductNames.has(product.normalizedName)) {
        errors.push({
          sheet: "Products",
          row: product.rowNumber,
          field: "name",
          message: `Product "${product.name}" already exists.`,
        });
      }
    }
  }

  // Check existing SKUs
  if (validatedVariants.length > 0) {
    const skus = validatedVariants.map((variant) => variant.sku);

    const existingVariants = await ProductVariant.find({
      sku: {
        $in: skus,
      },
    })
      .select("sku")
      .lean();

    const existingSkuSet = new Set(
      existingVariants.map((variant) =>
        String(variant.sku).trim().toUpperCase(),
      ),
    );

    for (const variant of validatedVariants) {
      if (existingSkuSet.has(variant.sku)) {
        errors.push({
          sheet: "Variants",
          row: variant.rowNumber,
          field: "sku",
          message: `SKU "${variant.sku}" already exists.`,
        });
      }
    }
  }

  const barcodeValues = validatedVariants
    .filter((variant) => variant.barcode)
    .map((variant) => variant.barcode);

  if (barcodeValues.length > 0) {
    const existingBarcodes = await ProductVariant.find({
      barcode: {
        $in: barcodeValues,
      },
    })
      .select("barcode")
      .lean();

    const existingBarcodeSet = new Set(
      existingBarcodes.map((variant) => String(variant.barcode).trim()),
    );

    for (const variant of validatedVariants) {
      if (variant.barcode && existingBarcodeSet.has(variant.barcode)) {
        errors.push({
          sheet: "Variants",
          row: variant.rowNumber,
          field: "barcode",
          message: `Barcode "${variant.barcode}" already exists.`,
        });
      }
    }
  }

  if (validatedVariants.length > 0) {
    const productNames = [
      ...new Set(validatedVariants.map((variant) => variant.productName)),
    ];

    const existingProducts = await Product.find({
      name: {
        $in: productNames,
      },
    })
      .select("_id name")
      .collation({
        locale: "en",
        strength: 2,
      })
      .lean();

    if (existingProducts.length > 0) {
      const existingProductIds = existingProducts.map((product) => product._id);

      const existingVariants = await ProductVariant.find({
        product: {
          $in: existingProductIds,
        },
      })
        .select("product name")
        .collation({
          locale: "en",
          strength: 2,
        })
        .lean();

      const existingProductNameMap = new Map();

      for (const product of existingProducts) {
        existingProductNameMap.set(
          normalizeName(product.name),
          product._id.toString(),
        );
      }

      const existingVariantNameSet = new Set();

      for (const variant of existingVariants) {
        existingVariantNameSet.add(
          `${variant.product.toString()}:` + `${normalizeName(variant.name)}`,
        );
      }

      for (const variant of validatedVariants) {
        const productId = existingProductNameMap.get(
          variant.normalizedProductName,
        );

        if (!productId) {
          continue;
        }

        const key = `${productId}:` + `${variant.normalizedVariantName}`;

        if (existingVariantNameSet.has(key)) {
          errors.push({
            sheet: "Variants",
            row: variant.rowNumber,
            field: "name",
            message: `Variant "${variant.name}" already exists for product "${variant.productName}".`,
          });
        }
      }
    }
  }

  if (errors.length > 0) {
    return {
      totalProductRows: validProductRows.length,
      totalVariantRows: validVariantRows.length,
      successfulProducts: 0,
      successfulVariants: 0,
      failedProducts: validProductRows.length,
      failedVariants: validVariantRows.length,
      importedProducts: [],
      importedVariants: [],

      errors,
    };
  }

  const session = await mongoose.startSession();

  try {
    let createdProducts = [];
    let createdVariants = [];

    await session.withTransaction(async () => {
      const productsToInsert = [];
      const generatedSlugs = new Set();

      for (const product of validatedProducts) {
        let slug = await generateUniqueSlug(Product, product.name);
        let suffix = 2;

        // Prevent collisions between products in this same Excel import.
        while (generatedSlugs.has(slug)) {
          slug = await generateUniqueSlug(Product, `${product.name} ${suffix}`);

          suffix++;
        }

        generatedSlugs.add(slug);

        productsToInsert.push({
          name: product.name,
          slug,
          description: product.description,
          brand: product.brand?.trim() || "",
          category: product.category,
          image: null,

          hasVariants: product.hasVariants,

          price: product.hasVariants ? null : product.price,
          costPrice: product.hasVariants ? null : product.costPrice,
          stock: product.hasVariants ? null : product.stock,
          unit: product.hasVariants ? null : product.unit,

          isActive: product.isActive,
        });
      }

      createdProducts = await Product.insertMany(productsToInsert, {
        session,
        ordered: true,
      });

      createdProducts = await Product.insertMany(productsToInsert, {
        session,
        ordered: true,
      });

      const createdProductMap = new Map();

      for (const product of createdProducts) {
        createdProductMap.set(normalizeName(product.name), product._id);
      }
      const variantsToInsert = [];

      const defaultSelected = new Set();

      for (const variant of validatedVariants) {
        const productId = createdProductMap.get(variant.normalizedProductName);

        if (!productId) {
          throw new Error(
            `Unable to find newly created product "${variant.productName}".`,
          );
        }

        let isDefault = variant.isDefault;

        if (isDefault) {
          defaultSelected.add(productId.toString());
        }

        if (!defaultSelected.has(productId.toString()) && !variant.isDefault) {
          const hasPreviousVariant = variantsToInsert.some(
            (item) => item.product.toString() === productId.toString(),
          );

          if (!hasPreviousVariant) {
            isDefault = true;

            defaultSelected.add(productId.toString());
          }
        }

        variantsToInsert.push({
          product: productId,
          name: variant.name,
          sku: variant.sku,
          barcode: variant.barcode,
          price: variant.price,
          costPrice: variant.costPrice,
          stock: variant.stock,
          unit: variant.unit,
          isDefault,
          isActive: variant.isActive,
        });
      }

      if (variantsToInsert.length > 0) {
        createdVariants = await ProductVariant.insertMany(variantsToInsert, {
          session,
          ordered: true,
        });
      }
    });

    await deleteCache(productCacheKeys.all);

    return {
      totalProductRows: validProductRows.length,
      totalVariantRows: validVariantRows.length,
      successfulProducts: createdProducts.length,
      successfulVariants: createdVariants.length,
      failedProducts: 0,
      failedVariants: 0,
      importedProducts: createdProducts.map((product) => ({
        id: product._id,
        name: product.name,
        slug: product.slug,
        hasVariants: product.hasVariants,
      })),

      importedVariants: createdVariants.map((variant) => ({
        id: variant._id,
        product: variant.product,
        name: variant.name,
        sku: variant.sku,
        barcode: variant.barcode,
        price: variant.price,
        stock: variant.stock,
        unit: variant.unit,
        isDefault: variant.isDefault,
        isActive: variant.isActive,
      })),

      errors: [],
    };
  } finally {
    await session.endSession();
  }
};
