import mongoose from "mongoose";

import Purchase from "../models/purchase.model.js";
import Supplier from "../models/supplier.model.js";
import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";

import { adjustStock } from "./inventory.service.js";

// GENERATE PURCHASE NUMBER
const generatePurchaseNumber = async () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const prefix = `PUR-${year}${month}${day}`;

  const lastPurchase = await Purchase.findOne({
    purchaseNumber: {
      $regex: `^${prefix}-`,
    },
  }).sort({
    purchaseNumber: -1,
  });

  let nextNumber = 1;

  if (lastPurchase) {
    const lastNumber = Number(lastPurchase.purchaseNumber.split("-").pop());

    nextNumber = lastNumber + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
};

// VALIDATE SUPPLIER
const validateSupplier = async (supplierId) => {
  if (!mongoose.Types.ObjectId.isValid(supplierId)) {
    throw new Error("Invalid supplier ID.");
  }

  const supplier = await Supplier.findById(supplierId);

  if (!supplier) {
    throw new Error("Supplier not found.");
  }

  if (!supplier.isActive) {
    throw new Error("Supplier is inactive.");
  }

  return supplier;
};

// VALIDATE PURCHASE ITEMS
const validatePurchaseItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Purchase must contain at least one item.");
  }

  const validatedItems = [];

  // Prevent same product/variant being added twice
  const itemKeys = new Set();

  for (const item of items) {
    const {
      product: productId,
      variant: variantId,
      quantity,
      costPrice,
    } = item;

    // Validate product ID
    if (!productId) {
      throw new Error("Product ID is required.");
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error("Invalid product ID.");
    }

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Purchase quantity must be a positive integer.");
    }

    // Find product
    const product = await Product.findById(productId);

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    if (!product.isActive) {
      throw new Error(`Product "${product.name}" is inactive.`);
    }

    // PRODUCT WITH VARIANTS
    if (product.hasVariants) {
      if (!variantId) {
        throw new Error(`Variant is required for product "${product.name}".`);
      }

      if (!mongoose.Types.ObjectId.isValid(variantId)) {
        throw new Error("Invalid variant ID.");
      }

      const variant = await ProductVariant.findOne({
        _id: variantId,
        product: productId,
      });

      if (!variant) {
        throw new Error(`Variant not found for product "${product.name}".`);
      }

      if (!variant.isActive) {
        throw new Error(`Variant "${variant.name}" is inactive.`);
      }

      // Ensure duplicate variant is not added
      const key = `${productId}-${variantId}`;

      if (itemKeys.has(key)) {
        throw new Error(`Variant "${variant.name}" is added more than once.`);
      }

      itemKeys.add(key);

      // Cost price
      if (costPrice === undefined || costPrice === null) {
        throw new Error(
          `Cost price is required for variant "${variant.name}".`,
        );
      }

      if (typeof costPrice !== "number" || costPrice < 0) {
        throw new Error("Cost price must be a non-negative number.");
      }

      const subtotal = quantity * costPrice;

      validatedItems.push({
        product: product._id,
        variant: variant._id,

        productName: product.name,
        variantName: variant.name,
        sku: variant.sku,
        quantity,
        receivedQuantity: 0,
        costPrice,
        subtotal,
      });

      continue;
    }

    // PRODUCT WITHOUT VARIANTS
    if (variantId) {
      throw new Error(`Product "${product.name}" does not have variants.`);
    }

    // Prevent duplicate product
    const key = `${productId}-product`;

    if (itemKeys.has(key)) {
      throw new Error(`Product "${product.name}" is added more than once.`);
    }

    itemKeys.add(key);

    // Cost price
    if (costPrice === undefined || costPrice === null) {
      throw new Error(`Cost price is required for product "${product.name}".`);
    }

    if (typeof costPrice !== "number" || costPrice < 0) {
      throw new Error("Cost price must be a non-negative number.");
    }

    const subtotal = quantity * costPrice;

    validatedItems.push({
      product: product._id,
      variant: null,

      productName: product.name,
      variantName: "",
      sku: "",
      quantity,
      receivedQuantity: 0,
      costPrice,
      subtotal,
    });
  }

  return validatedItems;
};

// CREATE PURCHASE
export const createPurchaseService = async ({
  supplier,
  items,
  discount = 0,
  notes = "",
  createdBy,
}) => {
  // Validate supplier
  await validateSupplier(supplier);

  // Validate discount
  if (typeof discount !== "number" || discount < 0) {
    throw new Error("Discount must be a non-negative number.");
  }

  // Validate items
  const validatedItems = await validatePurchaseItems(items);

  // Calculate subtotal
  const subtotal = validatedItems.reduce(
    (total, item) => total + item.subtotal,
    0,
  );

  // Prevent discount greater than subtotal
  if (discount > subtotal) {
    throw new Error("Discount cannot be greater than subtotal.");
  }

  const total = subtotal - discount;

  // Generate purchase number
  const purchaseNumber = await generatePurchaseNumber();

  // Create purchase
  const purchase = await Purchase.create({
    purchaseNumber,
    supplier,
    items: validatedItems,
    subtotal,
    discount,
    total,
    status: "DRAFT",
    notes,
    createdBy,
  });

  // Return populated purchase
  return await Purchase.findById(purchase._id)
    .populate("supplier", "name contactPerson email phoneNumber")
    .populate("createdBy", "fullName");
};

// GET ALL PURCHASES
export const getPurchasesService = async ({
  page = 1,
  limit = 10,
  status,
  supplier,
} = {}) => {
  page = Number(page);
  limit = Number(limit);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Page must be a positive integer.");
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Limit must be a positive integer.");
  }

  const filter = {};

  // Status filter
  if (status) {
    const allowedStatuses = [
      "DRAFT",
      "ORDERED",
      "PARTIALLY_RECEIVED",
      "RECEIVED",
      "CANCELLED",
    ];

    if (!allowedStatuses.includes(status)) {
      throw new Error("Invalid purchase status.");
    }

    filter.status = status;
  }

  // Supplier filter
  if (supplier) {
    if (!mongoose.Types.ObjectId.isValid(supplier)) {
      throw new Error("Invalid supplier ID.");
    }

    filter.supplier = supplier;
  }

  // Count
  const total = await Purchase.countDocuments(filter);

  // Fetch purchases
  const purchases = await Purchase.find(filter)
    .populate("supplier", "name contactPerson email phoneNumber")
    .populate("createdBy", "fullName")
    .sort({
      createdAt: -1,
    })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    purchases,

    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// GET PURCHASE BY ID
export const getPurchaseByIdService = async (purchaseId) => {
  if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
    throw new Error("Invalid purchase ID.");
  }

  const purchase = await Purchase.findById(purchaseId)
    .populate("supplier", "name contactPerson email phoneNumber address")
    .populate("items.product", "name hasVariants")
    .populate("items.variant", "name sku price costPrice stock")
    .populate("createdBy", "fullName");

  if (!purchase) {
    throw new Error("Purchase not found.");
  }

  return purchase;
};

// UPDATE PURCHASE
export const updatePurchaseService = async (
  purchaseId,
  { supplier, items, discount, notes },
) => {
  if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
    throw new Error("Invalid purchase ID.");
  }

  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new Error("Purchase not found.");
  }

  // Only drafts can be edited
  if (purchase.status !== "DRAFT") {
    throw new Error("Only draft purchases can be updated.");
  }

  // Supplier
  if (supplier !== undefined) {
    await validateSupplier(supplier);

    purchase.supplier = supplier;
  }

  // Items
  if (items !== undefined) {
    const validatedItems = await validatePurchaseItems(items);

    purchase.items = validatedItems;

    purchase.subtotal = validatedItems.reduce(
      (total, item) => total + item.subtotal,
      0,
    );
  }

  // Discount
  if (discount !== undefined) {
    if (typeof discount !== "number" || discount < 0) {
      throw new Error("Discount must be a non-negative number.");
    }

    purchase.discount = discount;
  }

  // Validate discount against subtotal
  if (purchase.discount > purchase.subtotal) {
    throw new Error("Discount cannot be greater than subtotal.");
  }

  purchase.total = purchase.subtotal - purchase.discount;

  // Notes
  if (notes !== undefined) {
    purchase.notes = notes;
  }

  await purchase.save();

  return await Purchase.findById(purchase._id)
    .populate("supplier", "name contactPerson email phoneNumber")
    .populate("createdBy", "fullName");
};

// MARK PURCHASE AS ORDERED
export const orderPurchaseService = async (purchaseId) => {
  if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
    throw new Error("Invalid purchase ID.");
  }

  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new Error("Purchase not found.");
  }

  if (purchase.status !== "DRAFT") {
    throw new Error("Only draft purchases can be marked as ordered.");
  }

  if (!purchase.items.length) {
    throw new Error("Cannot order a purchase without items.");
  }

  purchase.status = "ORDERED";
  purchase.orderedAt = new Date();

  await purchase.save();

  return await Purchase.findById(purchase._id)
    .populate("supplier", "name contactPerson email phoneNumber")
    .populate("createdBy", "fullName");
};

// RECEIVE PURCHASE
export const receivePurchaseService = async ({
  purchaseId,
  receivedItems,
  createdBy,
}) => {
  const session = await mongoose.startSession();

  try {
    let purchaseIdResult;

    await session.withTransaction(async () => {

      // VALIDATE PURCHASE ID
      if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
        throw new Error("Invalid purchase ID.");
      }

      // FIND PURCHASE
      const purchase = await Purchase.findById(purchaseId).session(session);

      if (!purchase) {
        throw new Error("Purchase not found.");
      }

      // VALIDATE STATUS
      if (
        purchase.status !== "ORDERED" &&
        purchase.status !== "PARTIALLY_RECEIVED"
      ) {
        throw new Error(
          "Only ordered or partially received purchases can be received.",
        );
      }

      // VALIDATE RECEIVED ITEMS
      if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
        throw new Error("Received items are required.");
      }

      // Prevent duplicate product/variant entries
      const receivedItemKeys = new Set();

      for (const item of receivedItems) {
        const { productId, variantId = null } = item;

        if (!productId) {
          throw new Error("Product ID is required for received item.");
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
          throw new Error("Invalid product ID.");
        }

        if (variantId && !mongoose.Types.ObjectId.isValid(variantId)) {
          throw new Error("Invalid variant ID.");
        }

        const key = variantId
          ? `${productId}-${variantId}`
          : `${productId}-product`;

        if (receivedItemKeys.has(key)) {
          throw new Error(
            "The same product or variant cannot be received more than once in the same request.",
          );
        }

        receivedItemKeys.add(key);
      }

      // PROCESS RECEIVED ITEMS
      for (const receivedItem of receivedItems) {
        const { productId, variantId, quantity } = receivedItem;

        // Validate product ID
        if (!productId) {
          throw new Error("Product ID is required for received item.");
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
          throw new Error("Invalid product ID.");
        }

        // Validate quantity
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error("Received quantity must be a positive integer.");
        }

        // Validate variant ID if supplied
        if (variantId && !mongoose.Types.ObjectId.isValid(variantId)) {
          throw new Error("Invalid variant ID.");
        }

        // FIND MATCHING PURCHASE ITEM
        const purchaseItem = purchase.items.find((item) => {
          const productMatches =
            item.product.toString() === productId.toString();

          const variantMatches = item.variant
            ? variantId && item.variant.toString() === variantId.toString()
            : !variantId;

          return productMatches && variantMatches;
        });

        if (!purchaseItem) {
          throw new Error("Received item does not belong to this purchase.");
        }

        // CALCULATE REMAINING QUANTITY
        const remainingQuantity =
          purchaseItem.quantity - purchaseItem.receivedQuantity;

        if (remainingQuantity <= 0) {
          throw new Error(
            `"${purchaseItem.productName}" has already been fully received.`,
          );
        }

        if (quantity > remainingQuantity) {
          throw new Error(
            `Cannot receive ${quantity}. Remaining quantity for "${purchaseItem.productName}" is ${remainingQuantity}.`,
          );
        }

        // UPDATE INVENTORY
        await adjustStock({
          productId: purchaseItem.product,
          variantId: purchaseItem.variant || null,
          movementType: "IN",
          quantity,
          reason: `Purchase ${purchase.purchaseNumber}`,
          referenceType: "PURCHASE",
          referenceId: purchase._id,
          createdBy,
          notes: `Received ${quantity} unit(s).`,
          session,
        });

        purchaseItem.receivedQuantity += quantity;
      }

      const allReceived = purchase.items.every(
        (item) => item.receivedQuantity === item.quantity,
      );

      const someReceived = purchase.items.some(
        (item) => item.receivedQuantity > 0,
      );

      if (allReceived) {
        purchase.status = "RECEIVED";
        purchase.receivedAt = new Date();
      } else if (someReceived) {
        purchase.status = "PARTIALLY_RECEIVED";
      }

      await purchase.save({ session });

      purchaseIdResult = purchase._id;
    });

    return await Purchase.findById(purchaseIdResult)
      .populate("supplier", "name contactPerson email phoneNumber")
      .populate("items.product", "name hasVariants")
      .populate("items.variant", "name sku price costPrice stock")
      .populate("createdBy", "fullName");
  } finally {
    await session.endSession();
  }
};

// CANCEL PURCHASE
export const cancelPurchaseService = async (purchaseId) => {
  if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
    throw new Error("Invalid purchase ID.");
  }

  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new Error("Purchase not found.");
  }

  // Cannot cancel completed purchase
  if (purchase.status === "RECEIVED") {
    throw new Error("Received purchases cannot be cancelled.");
  }

  if (purchase.status === "CANCELLED") {
    throw new Error("Purchase is already cancelled.");
  }

  // Cannot cancel partially received purchase
  if (purchase.status === "PARTIALLY_RECEIVED") {
    throw new Error("Partially received purchases cannot be cancelled.");
  }

  purchase.status = "CANCELLED";
  purchase.cancelledAt = new Date();

  await purchase.save();

  return purchase;
};
