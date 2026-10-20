import mongoose from "mongoose";
import CustomerAddress from "../models/customer-address.model.js";
import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";
import { adjustStock } from "./inventory.service.js";
import { createNotification } from "./notification.service.js";
import Counter from "../models/counter.model.js";
import Payment from "../models/payment.model.js";
import { refundOrderPaymentService } from "./refund.service.js";

// Generate Order Number
const generateOrderNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: "orderNumber" },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return `ORD-${String(counter.seq).padStart(5, "0")}`;
};

// Create Customer Order
export const createCustomerOrderService = async ({
  customerId,
  items,
  paymentMethod,
  fulfillmentType = "DELIVERY",
  deliveryAddressId,
  deliveryAddress,
}) => {
  if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
    throw new Error("Valid customer ID is required.");
  }

  const allowedPaymentMethods = ["CASH", "CARD", "ONLINE"];

  if (!allowedPaymentMethods.includes(paymentMethod)) {
    throw new Error("Invalid payment method.");
  }

  if (!["TAKEAWAY", "DELIVERY"].includes(fulfillmentType)) {
    throw new Error("Invalid fulfillment type.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Order must contain at least one item.");
  }

  let finalDeliveryAddress;

  if (fulfillmentType === "DELIVERY") {
    const customer = await User.findOne({
      _id: customerId,
      role: "CUSTOMER",
    }).select("fullName phoneNumber");

    if (!customer) {
      throw new Error("Customer not found.");
    }

    if (deliveryAddressId) {
      if (!mongoose.Types.ObjectId.isValid(deliveryAddressId)) {
        throw new Error("Invalid saved address ID.");
      }

      const savedAddress = await CustomerAddress.findOne({
        _id: deliveryAddressId,
        customer: customerId,
      });

      if (!savedAddress) {
        throw new Error("Saved address not found.");
      }

      // Convert the saved address into an order address snapshot.
      finalDeliveryAddress = {
        address: [
          savedAddress.houseNumber,
          savedAddress.street,
          savedAddress.landmark,
          savedAddress.city,
        ]
          .filter(Boolean)
          .join(", "),

        contactName: customer.fullName,
        contactPhone: customer.phoneNumber,

        instructions: savedAddress.specialInstruction || "",
      };

      // Copy GPS coordinates when the saved address has them.
      if (
        savedAddress.location?.type === "Point" &&
        Array.isArray(savedAddress.location.coordinates) &&
        savedAddress.location.coordinates.length === 2
      ) {
        finalDeliveryAddress.location = {
          type: "Point",
          coordinates: [...savedAddress.location.coordinates],
        };
      }
    } else {
      // Manually entered address.
      if (!deliveryAddress || typeof deliveryAddress !== "object") {
        throw new Error("Select a saved address or enter a delivery address.");
      }

      const { address, contactName, contactPhone, instructions, location } =
        deliveryAddress;

      if (
        typeof address !== "string" ||
        !address.trim() ||
        typeof contactName !== "string" ||
        !contactName.trim() ||
        typeof contactPhone !== "string" ||
        !contactPhone.trim()
      ) {
        throw new Error(
          "Delivery address, contact name and contact phone are required.",
        );
      }

      finalDeliveryAddress = {
        address: address.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        instructions: instructions?.trim() || "",
      };

      // GPS coordinates are optional.
      if (location !== undefined && location !== null) {
        if (
          location.type !== "Point" ||
          !Array.isArray(location.coordinates) ||
          location.coordinates.length !== 2
        ) {
          throw new Error("Invalid location coordinates.");
        }

        const [longitude, latitude] = location.coordinates;

        if (
          typeof longitude !== "number" ||
          !Number.isFinite(longitude) ||
          typeof latitude !== "number" ||
          !Number.isFinite(latitude) ||
          longitude < -180 ||
          longitude > 180 ||
          latitude < -90 ||
          latitude > 90
        ) {
          throw new Error("Invalid location coordinates.");
        }

        finalDeliveryAddress.location = {
          type: "Point",
          coordinates: [longitude, latitude],
        };
      }
    }

    if (
      !finalDeliveryAddress.address ||
      !finalDeliveryAddress.contactName ||
      !finalDeliveryAddress.contactPhone
    ) {
      throw new Error("Delivery address and contact details are required.");
    }
  }

  // This preserves your existing product/variant validation.
  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const { productId, variantId, quantity } = item;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
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

    if (product.hasVariants) {
      if (!variantId || !mongoose.Types.ObjectId.isValid(variantId)) {
        throw new Error(`Please select a valid variant for ${product.name}.`);
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
    } else {
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
    fulfillmentType,
    ...(fulfillmentType === "DELIVERY"
      ? { deliveryAddress: finalDeliveryAddress }
      : {}),
    paymentStatus: "PENDING",
    status: "PENDING",
    inventoryProcessed: false,
    stockReserved: false,
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

  const session = await mongoose.startSession();

  let orderNumber;

  try {
    await session.withTransaction(async () => {
      // 1. Find the order belonging to this customer.
      const order = await Order.findOne({
        _id: orderId,
        customer: customerId,
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

      if (order.status !== "PENDING" && order.status !== "CONFIRMED") {
        throw new Error("This order can no longer be cancelled.");
      }

      // Remember the original inventory state before updating the order.
      const shouldRestoreStock = order.inventoryProcessed;

      // Prepare a refund when a paid online order is cancelled.
      if (order.paymentMethod === "ONLINE" && order.paymentStatus === "PAID") {
        const payment = await Payment.findOne({
          order: order._id,
          status: "PAID",
        }).session(session);

        if (!payment || !payment.transactionId) {
          throw new Error(
            "The paid Stripe payment could not be found. Cancellation was not completed.",
          );
        }

        payment.status = "REFUND_PENDING";
        await payment.save({ session });

        order.paymentStatus = "REFUND_PENDING";
      }

      // Only an order still in an eligible status can be cancelled.
      const cancelledOrder = await Order.findOneAndUpdate(
        {
          _id: orderId,
          customer: customerId,
          status: { $in: ["PENDING", "CONFIRMED"] },
        },
        {
          $set: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            inventoryProcessed: false,
          },
        },
        {
          new: true,
          session,
          runValidators: true,
        },
      );

      if (!cancelledOrder) {
        throw new Error(
          "This order has already been cancelled or can no longer be cancelled.",
        );
      }

      // 3. Restore stock inside the same transaction.
      if (shouldRestoreStock) {
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
            session,
          });
        }
      }

      orderNumber = order.orderNumber;
    });

    // The transaction has committed successfully.
  } finally {
    await session.endSession();
  }

  // Process the refund after the cancellation transaction commits.
  if (orderNumber) {
    const cancelledOrder = await Order.findById(orderId);

    if (cancelledOrder?.paymentStatus === "REFUND_PENDING") {
      try {
        await refundOrderPaymentService(orderId);
      } catch (error) {
        // Cancellation has already committed.
        // Keep REFUND_PENDING so the refund can be retried.
        console.error(`Refund failed for order ${orderNumber}:`, error.message);
      }
    }
  }

  // 4. Send notification only after the transaction succeeds.
  await createNotification({
    recipient: customerId,
    title: "Order Cancelled",
    message: `Your order ${orderNumber} has been cancelled.`,
    type: "ORDER",
    data: {
      orderId,
      orderNumber,
      status: "CANCELLED",
    },
  });

  // 5. Return the updated order with populated product information.
  return await Order.findById(orderId)
    .populate({
      path: "items.product",
      populate: {
        path: "image",
      },
    })
    .populate("items.variant");
};
