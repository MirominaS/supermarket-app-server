import mongoose from "mongoose";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";

export const getOrdersService = async ({ status } = {}) => {
  const filter = {};

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
    .populate("customer", "fullName email phoneNumber")
    .populate("items.product", "name")
    .populate("items.variant", "name sku price stock")
    .sort({ createdAt: -1 });
};

export const getOrderByIdService = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order ID.");
  }

  const order = await Order.findById(orderId)
    .populate("customer", "fullName email phoneNumber")
    .populate("items.product", "name")
    .populate("items.variant", "name sku price stock");

  if (!order) {
    throw new Error("Order not found.");
  }

  return order;
};

export const updateOrderStatusService = async (orderId, status) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order ID.");
  }

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

  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.status === "CANCELLED") {
    throw new Error("Cancelled orders cannot be updated.");
  }

  if (order.status === "COMPLETED") {
    throw new Error("Completed orders cannot be updated.");
  }

  order.status = status;

  if (status === "COMPLETED") {
    order.completedAt = new Date();

    // Cash orders become paid when completed
    if (order.paymentMethod === "CASH" && order.paymentStatus === "PENDING") {
      order.paymentStatus = "PAID";
    }
  }

  if (status === "CANCELLED") {
    order.cancelledAt = new Date();
  }

  await order.save();

  // Complete only cash orders
  if (
    status === "COMPLETED" &&
    order.paymentMethod === "CASH" &&
    order.paymentStatus === "PAID"
  ) {
    await completeOrderService(order._id);
  }
  return await Order.findById(order._id)
    .populate("customer", "fullName email phoneNumber")
    .populate("items.product", "name")
    .populate("items.variant", "name sku price stock");
};

export const cancelOrderService = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order ID.");
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.status === "CANCELLED") {
    throw new Error("Order is already cancelled.");
  }

  if (order.status === "COMPLETED") {
    throw new Error("Completed orders cannot be cancelled.");
  }

  // Restore stock only if inventory was already deducted
  if (order.inventoryProcessed) {
    for (const item of order.items) {
      await adjustStock({
        productId: item.product,
        variantId: item.variant,
        movementType: "IN",
        quantity: item.quantity,
        reason: "Order Cancelled",
        referenceType: "ORDER",
        referenceId: order._id,
      });
    }

    order.inventoryProcessed = false;
  }

  order.status = "CANCELLED";
  order.cancelledAt = new Date();

  await order.save();

  return order;
};
