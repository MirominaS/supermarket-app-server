import mongoose from "mongoose";
import Order from "../models/order.model.js";
import { completeOrderService } from "./order-completion.service.js";
import { adjustStock } from "./inventory.service.js";
import Payment from "../models/payment.model.js";
import { refundOrderPaymentService } from "./refund.service.js";

export const getOrdersService = async ({ status } = {}) => {
  const filter = {
    isDeleted: { $ne: true },
  };

  if (status) {
    const allowedStatuses = [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "READY",
      "OUT_FOR_DELIVERY",
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

  const order = await Order.findOne({
    _id: orderId,
    isDeleted: { $ne: true },
  })
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
    "OUT_FOR_DELIVERY",
    "COMPLETED",
    "CANCELLED",
  ];

  const statusOrder = {
    PENDING: 1,
    CONFIRMED: 2,
    PROCESSING: 3,
    READY: 4,
    OUT_FOR_DELIVERY: 5,
    COMPLETED: 6,
  };

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid order status.");
  }

  const order = await Order.findOne({
    _id: orderId,
    isDeleted: { $ne: true },
  });

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

  const session = await mongoose.startSession();

  let shouldRefund = false;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: orderId,
        isDeleted: { $ne: true },
      }).session(session);

      if (!order) {
        throw new Error("Order not found.");
      }

      if (order.status === "CANCELLED") {
        throw new Error("Order is already cancelled.");
      }

      if (order.status === "COMPLETED") {
        throw new Error("Completed orders cannot be cancelled.");
      }

      // Keep the statuses your admin workflow allows.
      if (!["PENDING", "CONFIRMED"].includes(order.status)) {
        throw new Error(`Cannot cancel an order with status ${order.status}.`);
      }

      const shouldRestoreStock = order.inventoryProcessed;

      shouldRefund =
        ["CARD", "ONLINE"].includes(order.paymentMethod) &&
        order.paymentStatus === "PAID";

      // Prepare the refund before committing the cancellation.
      // Stripe itself is called only after the transaction commits.
      if (shouldRefund) {
        const payment = await Payment.findOne({
          order: order._id,
          status: "PAID",
        }).session(session);

        if (!payment) {
          throw new Error(
            "Paid payment record not found. Cannot safely cancel this order.",
          );
        }

        if (!payment.transactionId) {
          throw new Error(
            "Stripe Payment Intent ID is missing. Cannot refund this order.",
          );
        }

        payment.status = "REFUND_PENDING";
        await payment.save({ session });

        order.paymentStatus = "REFUND_PENDING";
      }

      // Restore stock only if it was deducted previously.
      if (shouldRestoreStock) {
        for (const item of order.items) {
          await adjustStock({
            productId: item.product,
            variantId: item.variant,
            movementType: "IN",
            quantity: item.quantity,
            reason: `Cancellation of order ${order.orderNumber}`,
            referenceType: "ORDER",
            referenceId: order._id,
            session,
          });
        }
      }

      order.status = "CANCELLED";
      order.cancelledAt = new Date();
      order.inventoryProcessed = false;

      await order.save({ session });
    });
  } finally {
    await session.endSession();
  }

  // IMPORTANT: Call Stripe after MongoDB has committed.
  if (shouldRefund) {
    try {
      const refundResult = await refundOrderPaymentService(orderId);

      console.log("Order refund result:", refundResult.message);
    } catch (error) {
      // The order remains cancelled and the refund remains pending.
      // Do not restore stock again when retrying the refund.
      console.error(`Refund failed for order ${orderId}:`, error.message);
    }
  }

  return await Order.findById(orderId).populate("customer", "name email");
};

export const deleteOrderService = async (orderId, adminId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order ID.");
  }

  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    throw new Error("Invalid admin ID.");
  }

  const order = await Order.findOne({
    _id: orderId,
    isDeleted: { $ne: true },
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  // Active orders must be cancelled before they can be hidden.
  if (order.status !== "CANCELLED") {
    throw new Error(
      "Only cancelled orders can be deleted. Cancel the order first.",
    );
  }

  // Preserve paid-order history.
  if (order.paymentStatus === "PAID") {
    throw new Error(
      "A paid order cannot be deleted. Keep it for financial records.",
    );
  }

  const deletedOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      isDeleted: { $ne: true },
      status: "CANCELLED",
      paymentStatus: { $ne: "PAID" },
    },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: adminId,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!deletedOrder) {
    throw new Error(
      "The order could not be deleted. It may have already been deleted or changed.",
    );
  }

  return deletedOrder;
};

export const exportOrdersService = async ({ status } = {}) => {
  const filter = {
    isDeleted: { $ne: true },
  };
  if (status) {
    const allowedStatuses = [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "READY",
      "OUT_FOR_DELIVERY",
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
