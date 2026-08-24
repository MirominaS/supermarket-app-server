import mongoose from "mongoose";

import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";
import { adjustStock } from "./inventory.service.js";
import { createNotification } from "./notification.service.js";

// Generate Order Number
const generateOrderNumber = async () => {
  const count = await Order.countDocuments();

  return `ORD-${String(count + 1).padStart(5, "0")}`;
};

// Create Customer Order
export const createCustomerOrderService = async ({
  customerId,
  items,
  paymentMethod,
  deliveryAddress,
}) => {
  if (!customerId) {
    throw new Error("Customer ID is required.");
  }

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID.");
  }

  const allowedPaymentMethods = ["CASH", "CARD", "ONLINE"];

  if (!allowedPaymentMethods.includes(paymentMethod)) {
    throw new Error("Invalid payment method.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Order must contain at least one item.");
  }

  if (!deliveryAddress) {
    throw new Error("Delivery address is required.");
  }

  const { address, contactName, contactPhone, instructions, location } =
    deliveryAddress;

  if (
    !address ||
    !contactName ||
    !contactPhone ||
    !location ||
    location.type !== "Point" ||
    !Array.isArray(location.coordinates) ||
    location.coordinates.length !== 2
  ) {
    throw new Error("Invalid delivery address.");
  }

  // Validate coordinates
  const [longitude, latitude] = location.coordinates;

  if (
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error("Invalid location coordinates.");
  }

  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const { productId, variantId, quantity } = item;

    if (!productId) {
      throw new Error("Product ID is required.");
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error("Invalid product ID.");
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      throw new Error(`Invalid quantity for product ${productId}.`);
    }

    const product = await Product.findOne({
      _id: productId,
      isActive: true,
    });

    if (!product) {
      throw new Error(
        "One of the products in your cart is no longer available.",
      );
    }

    // product with variants
    if (product.hasVariants) {
      if (!variantId) {
        throw new Error(`Please select a variant for ${product.name}.`);
      }

      if (!mongoose.Types.ObjectId.isValid(variantId)) {
        throw new Error(`Invalid variant for ${product.name}.`);
      }

      const variant = await ProductVariant.findOne({
        _id: variantId,
        product: product._id,
        isActive: true,
      });

      if (!variant) {
        throw new Error(
          `Variant for "${product.name}" is no longer available.`,
        );
      }

      if (variant.stock < parsedQuantity) {
        throw new Error(
          `Only ${variant.stock} ${variant.name} available for ${product.name}.`,
        );
      }

      const price = variant.price;

      const itemSubtotal = price * parsedQuantity;

      subtotal += itemSubtotal;

      orderItems.push({
        product: product._id,
        variant: variant._id,
        productName: product.name,
        variantName: variant.name,
        sku: variant.sku,
        quantity: parsedQuantity,
        price,
        subtotal: itemSubtotal,
      });
    }

    // product without variants
    else {
      if (variantId) {
        throw new Error(`${product.name} does not have variants.`);
      }

      if (
        product.stock === null ||
        product.stock === undefined ||
        product.stock < parsedQuantity
      ) {
        throw new Error(
          `Only ${product.stock ?? 0} ${product.unit || "items"} available for ${product.name}.`,
        );
      }

      const price = product.price;

      const itemSubtotal = price * parsedQuantity;

      subtotal += itemSubtotal;

      orderItems.push({
        product: product._id,
        variant: null,
        productName: product.name,
        variantName: null,
        sku: null,

        quantity: parsedQuantity,
        price,
        subtotal: itemSubtotal,
      });
    }
  }
  const discount = 0;

  const total = subtotal - discount;

  const orderNumber = await generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    customer: customerId,
    items: orderItems,
    subtotal,
    discount,
    total,
    paymentMethod,
    paymentStatus: "PENDING",
    status: "PENDING",
    inventoryProcessed: false,
    stockReserved: false,
    deliveryAddress: {
      address,
      contactName,
      contactPhone,
      instructions: instructions || "",
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    },
  });

  const processedItems = [];

  try {
    for (const item of orderItems) {
      await adjustStock({
        productId: item.product,
        variantId: item.variant,
        movementType: "OUT",
        quantity: item.quantity,
        reason: `Order ${order.orderNumber}`,
        referenceType: "ORDER",
        referenceId: order._id,
        createdBy: customerId,
      });

      processedItems.push(item);
    }
    order.inventoryProcessed = true;

    await order.save();
  } catch (error) {
    console.error("Order stock deduction failed:", error);

    // Roll back already processed stock
    for (const item of processedItems) {
      try {
        await adjustStock({
          productId: item.product,
          variantId: item.variant,
          movementType: "IN",
          quantity: item.quantity,
          reason: `Rollback for failed order ${order.orderNumber}`,
          referenceType: "ORDER",
          referenceId: order._id,
          createdBy: customerId,
        });
      } catch (rollbackError) {
        console.error("Stock rollback failed:", rollbackError);
      }
    }

    await Order.findByIdAndDelete(order._id);
    throw error;
  }
  //order notification
  await createNotification({
    recipient: customerId,
    title: "Order placed successfully",
    message: `Your order ${order.orderNumber} has been placed successfully.`,
    type: "ORDER",
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
    },
  });

  if (paymentMethod !== "ONLINE") {
    await createNotification({
      recipient: customerId,
      title: "Payment Pending",
      message:
        "Your order has been received. Please complete the payment upon delivery.",
      type: "PAYMENT",
      data: {
        orderId: order._id,
        paymentMethod,
      },
    });
  }

  return await Order.findById(order._id)
    .populate("customer", "fullName email phoneNumber")
    .populate({
      path: "items.product",
      populate: {
        path: "image",
      },
    })
    .populate("items.variant");
};

// Get Customer Orders
export const getCustomerOrdersService = async ({ customerId, status }) => {
  const filter = {
    customer: customerId,
  };

  if (status) {
    const allowedStatuses = [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "READY",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!allowedStatuses.includes(status)) {
      throw new Error("Invalid order status.");
    }

    filter.status = status;
  }

  return await Order.find(filter)
    .populate({
      path: "items.product",
      populate: {
        path: "image",
      },
    })
    .populate("items.variant")
    .sort({
      createdAt: -1,
    });
};

// Get Customer Order By ID
export const getCustomerOrderByIdService = async (customerId, orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order ID.");
  }

  const order = await Order.findOne({
    _id: orderId,
    customer: customerId,
  })
    .populate({
      path: "items.product",
      populate: {
        path: "image",
      },
    })
    .populate("items.variant");

  if (!order) {
    throw new Error("Order not found.");
  }

  return order;
};

// Cancel Customer Order
export const cancelCustomerOrderService = async (customerId, orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order ID.");
  }

  const order = await Order.findOne({
    _id: orderId,
    customer: customerId,
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.status === "CANCELLED") {
    throw new Error("Order is already cancelled.");
  }

  if (order.status === "COMPLETED") {
    throw new Error("Completed orders cannot be cancelled.");
  }

  if (order.status !== "PENDING" && order.status !== "CONFIRMED") {
    throw new Error("This order can no longer be cancelled.");
  }

  // Restore stock
  if (order.inventoryProcessed) {
    for (const item of order.items) {
      await adjustStock({
        productId: item.product,
        variantId: item.variant,
        movementType: "IN",
        quantity: item.quantity,
        reason: `Order ${order.orderNumber} cancelled`,
        referenceType: "ORDER",
        referenceId: order._id,
        createdBy: customerId,
      });
    }
    order.inventoryProcessed = false;
  }

  order.status = "CANCELLED";
  order.cancelledAt = new Date();

  await order.save();

  await createNotification({
    recipient: customerId,
    title: "Order Cancelled",
    message: `Your order ${order.orderNumber} has been cancelled.`,
    type: "ORDER",
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
    },
  });

  // Return cancelled order
  return await Order.findById(order._id)
    .populate({
      path: "items.product",
      populate: {
        path: "image",
      },
    })
    .populate("items.variant");
};
