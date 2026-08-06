import mongoose from "mongoose";

import Cart from "../models/cart.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";

import { createNotification } from "./notification.service.js";

const generateOrderNumber = async () => {
  const count = await Order.countDocuments();

  return `ORD-${String(count + 1).padStart(5, "0")}`;
};

export const createCustomerOrderService = async ({
  customerId,
  paymentMethod,
  deliveryAddress,
}) => {
  const allowedPaymentMethods = ["CASH", "CARD", "ONLINE"];

  if (!allowedPaymentMethods.includes(paymentMethod)) {
    throw new Error("Invalid payment method.");
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

  // Get customer cart
  const cart = await Cart.findOne({
    customer: customerId,
  })
    .populate("items.product")
    .populate("items.variant");

  if (!cart || cart.items.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const orderItems = [];
  let subtotal = 0;

  for (const item of cart.items) {
    const product = await Product.findOne({
      _id: item.product._id,
      isActive: true,
    });

    if (!product) {
      throw new Error(`Product not found.`);
    }

    const variant = await ProductVariant.findOne({
      _id: item.variant._id,
      product: product._id,
      isActive: true,
    });

    if (!variant) {
      throw new Error(`Variant not found for ${product.name}.`);
    }

    if (variant.stock < item.quantity) {
      throw new Error(`Only ${variant.stock} ${variant.name} available.`);
    }

    const itemSubtotal = variant.price * item.quantity;

    subtotal += itemSubtotal;

    orderItems.push({
      product: product._id,
      variant: variant._id,

      productName: product.name,
      variantName: variant.name,

      sku: variant.sku,

      quantity: item.quantity,

      price: variant.price,

      subtotal: itemSubtotal,
    });
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
    deliveryAddress,
  });

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

  // Deduct stock immediately for non-online payments
  if (paymentMethod !== "ONLINE") {
    for (const item of orderItems) {
      await ProductVariant.findByIdAndUpdate(item.variant, {
        $inc: {
          stock: -item.quantity,
        },
      });
    }

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

  cart.items = [];

  await cart.save();

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
  for (const item of order.items) {
    await ProductVariant.findByIdAndUpdate(item.variant, {
      $inc: {
        stock: item.quantity,
      },
    });
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
    },
  });

  return await Order.findById(order._id)
    .populate({
      path: "items.product",
      populate: {
        path: "image",
      },
    })
    .populate("items.variant");
};
