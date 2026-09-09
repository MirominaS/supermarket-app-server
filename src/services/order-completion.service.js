import mongoose from "mongoose";
import Order from "../models/order.model.js";
import { adjustStock } from "./inventory.service.js";
import { createSaleFromOrder } from "./sales.service.js";

export const completeOrderService = async (orderId) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findById(orderId).session(session);

    if (!order) {
      throw new Error("Order not found.");
    }

    // Prevent duplicate processing
    if (order.inventoryProcessed) {
      await session.abortTransaction();
      return order;
    }

    // Reduce stock
    for (const item of order.items) {
      await adjustStock({
        productId: item.product,
        variantId: item.variant,
        movementType: "OUT",
        quantity: item.quantity,
        reason: `Order ${order.orderNumber}`,
        referenceType: "ORDER",
        referenceId: order._id,
        session,
      });
    }

    await createSaleFromOrder(order,session);

    order.inventoryProcessed = true;

    await order.save({ session });

    await session.commitTransaction();

    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};