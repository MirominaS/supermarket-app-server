import mongoose from "mongoose";
import Cart from "../models/cart.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";
import { adjustStock } from "./inventory.service.js";
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

  //Validate delivery address
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

  //Get customer cart
  const cart = await Cart.findOne({
    customer: customerId,
  })
    .populate("items.product")
    .populate("items.variant");

  if (!cart || cart.items.length === 0) {
    throw new Error("Your cart is empty.");
  }

  //Validate cart and prepare order items
  const orderItems = [];
  let subtotal = 0;

  for (const item of cart.items) {
    // Validate product
    const product = await Product.findOne({
      _id: item.product._id,
      isActive: true,
    });

    if (!product) {
      throw new Error(
        `Product "${item.product?.name || ""}" is no longer available.`,
      );
    }

    // Validate variant
    const variant = await ProductVariant.findOne({
      _id: item.variant._id,
      product: product._id,
      isActive: true,
    });

    if (!variant) {
      throw new Error(`Variant not found for ${product.name}.`);
    }

    // Validate stock
    if (variant.stock < item.quantity) {
      throw new Error(
        `Only ${variant.stock} ${variant.name} available for ${product.name}.`,
      );
    }

    // Always use current database price
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

  //Calculate order totals
  const discount = 0;
  const total = subtotal - discount;

  const orderNumber = await generateOrderNumber();

  // Create order
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
    deliveryAddress,
  });

  //Deduct stock
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

    // All stock successfully deducted
    order.inventoryProcessed = true;

    await order.save();
  } catch (error) {
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

    // Delete the failed order
    await Order.findByIdAndDelete(order._id);

    throw error;
  }

  // Notify customer
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


  //Payment notification
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

  // Clear cart
  cart.items = [];

  await cart.save();

  //Return populated order
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
