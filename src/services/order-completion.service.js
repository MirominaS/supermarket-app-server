import Order from "../models/order.model.js";
import { adjustStock } from "./inventory.service.js";
import { createSaleFromOrder } from "./sales.service.js";

export const completeOrderService = async (orderId) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found.");
  }

  // Prevent duplicate processing
  if (order.inventoryProcessed) {
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
    });
  }

  // Create Sale
  await createSaleFromOrder(order);

  // Mark inventory processed
  order.inventoryProcessed = true;

  await order.save();

  return order;
};