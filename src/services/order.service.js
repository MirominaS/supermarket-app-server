import mongoose from "mongoose";
import Order from "../models/order.model.js";
import { completeOrderService } from "./order-completion.service.js";
import { adjustStock } from "./inventory.service.js";

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

  const statusOrder = {
    PENDING: 1,
    CONFIRMED: 2,
    PROCESSING: 3,
    READY: 4,
    COMPLETED: 5,
  };

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

  if (
    status !== "CANCELLED" &&
    statusOrder[status] < statusOrder[order.status]
  ) {
    throw new Error(
      `Order status cannot move backward from ${order.status} to ${status}.`,
    );
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

export const exportOrdersService = async ({ status } = {}) => {
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

  const orders = await Order.find(filter)
    .populate("customer", "fullName email phoneNumber")
    .populate("items.product", "name")
    .populate("items.variant", "name sku")
    .sort({
      createdAt: -1,
    })
    .lean();

  // Convert orders into Excel rows
  const rows = [];

  for (const order of orders) {
    for (const item of order.items) {
      rows.push({
        orderNumber: order.orderNumber,

        orderDate: order.createdAt
          ? new Date(order.createdAt).toISOString()
          : "",

        customerName: order.customer?.fullName || "",

        customerEmail: order.customer?.email || "",

        customerPhone: order.customer?.phoneNumber || "",

        status: order.status,

        paymentMethod: order.paymentMethod,

        paymentStatus: order.paymentStatus,

        productName: item.product?.name || item.productName || "",

        variantName: item.variant?.name || item.variantName || "",

        sku: item.variant?.sku || item.sku || "",

        quantity: item.quantity,

        price: item.price,

        subtotal: item.subtotal,

        orderSubtotal: order.subtotal,

        discount: order.discount,

        orderTotal: order.total,

        deliveryAddress: order.deliveryAddress?.address || "",

        contactName: order.deliveryAddress?.contactName || "",

        contactPhone: order.deliveryAddress?.contactPhone || "",

        deliveryInstructions: order.deliveryAddress?.instructions || "",

        cancelledAt: order.cancelledAt
          ? new Date(order.cancelledAt).toISOString()
          : "",

        completedAt: order.completedAt
          ? new Date(order.completedAt).toISOString()
          : "",
      });
    }
  }

  return rows;
};
