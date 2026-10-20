import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Payment from "../models/payment.model.js";
import { getStripeClient } from "../config/stripe.js";
import { createNotification } from "./notification.service.js";
import User from "../models/user.model.js";
import { completeOrderService } from "./order-completion.service.js";
import { getDecryptedWebhookSecretService } from "./payment-settings.service.js";
import { refundOrderPaymentService } from "./refund.service.js";
import escapeRegex from "../utils/escape-regex.js";
import {createSaleFromOrder} from "./sales.service.js";

export const createOrderCheckoutService = async (customerId, orderId) => {
  const stripe = await getStripeClient();
  // Validate order ID
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order ID.");
  }

  // Find order
  const order = await Order.findOne({
    _id: orderId,
    customer: customerId,
  }).populate("customer", "email fullName");

  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.paymentMethod !== "ONLINE") {
    throw new Error("This order does not require online payment.");
  }

  // Already paid?
  if (order.paymentStatus === "PAID") {
    throw new Error("Order has already been paid.");
  }

  // Existing pending payment?
  const existingPayment = await Payment.findOne({
    order: order._id,
    status: "PENDING",
  });

  if (existingPayment) {
    throw new Error("A pending payment already exists for this order.");
  }

  // Create Stripe Embedded Checkout Session
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded_page",
    mode: "payment",

    line_items: [
      {
        price_data: {
          currency: "eur",

          product_data: {
            name: `Order ${order.orderNumber}`,
          },

          unit_amount: Math.round(order.total * 100),
        },

        quantity: 1,
      },
    ],

    metadata: {
      orderId: order._id.toString(),
    },

    return_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
  });

  // Save payment
  const payment = await Payment.create({
    order: order._id,
    customer: order.customer._id,
    stripeSessionId: session.id,
    amount: order.total,
    currency: "EUR",
    gateway: "CARD",
    status: "PENDING",
    customerEmail: order.customer.email,
  });

  return {
    clientSecret: session.client_secret,
    payment,
  };
};

const processSuccessfulCheckoutSession = async (session) => {
  if (session.payment_status !== "paid") {
    throw new Error("Payment has not been completed.");
  }

  const payment = await Payment.findOne({
    stripeSessionId: session.id,
  });

  if (!payment) {
    throw new Error("Payment not found.");
  }

  if (!session.payment_intent) {
    throw new Error("Stripe payment intent not found.");
  }

  const stripe = await getStripeClient();

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent.id;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    throw new Error("Stripe payment has not succeeded.");
  }

  let gateway = "CARD";

  if (paymentIntent.payment_method) {
    const paymentMethodId =
      typeof paymentIntent.payment_method === "string"
        ? paymentIntent.payment_method
        : paymentIntent.payment_method.id;

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    const wallet = paymentMethod.card?.wallet?.type;

    if (wallet === "google_pay") {
      gateway = "GOOGLE_PAY";
    } else if (wallet === "apple_pay") {
      gateway = "APPLE_PAY";
    } else if (paymentMethod.type === "link") {
      gateway = "LINK";
    }
  }

  // Atomically mark the payment as paid only once.
  const updatedPayment = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      status: { $ne: "PAID" },
    },
    {
      $set: {
        status: "PAID",
        transactionId: paymentIntent.id,
        paidAt: new Date(),
        gateway,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  // If another request already processed the payment,
  // retrieve its current state.
  const finalPayment = updatedPayment || (await Payment.findById(payment._id));

  if (!finalPayment) {
    throw new Error("Payment not found.");
  }

  const order = await Order.findById(finalPayment.order);

  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.status === "CANCELLED") {
    // Payment really succeeded in Stripe, but the order was cancelled.
    // Do not confirm the order or create a normal sale.
    finalPayment.status = "REFUND_PENDING";
    finalPayment.transactionId = paymentIntent.id;
    finalPayment.paidAt = finalPayment.paidAt || new Date();

    await finalPayment.save();

    order.paymentStatus = "REFUND_PENDING";
    await order.save();

    try {
      await refundOrderPaymentService(order._id);
    } catch (error) {
      // Leave the refund pending so it can be retried.
      console.error(
        `Refund pending for cancelled order ${order.orderNumber}:`,
        error.message,
      );
    }

    return finalPayment;
  }

  if (order.paymentStatus !== "PAID" || order.status !== "CONFIRMED") {
    order.paymentStatus = "PAID";
    order.status = "CONFIRMED";

    await order.save();
  }

  // Keep this operation safe to retry.
  // It should not deduct stock or create duplicate records
  // when called more than once for the same order.
  await completeOrderService(order._id);

  // Create the sale and invoice after successful payment.
  // createSaleFromOrder checks whether a sale already exists.
  await createSaleFromOrder(order);

  // Send notifications only when this request first marked
  // the payment as paid.
  if (updatedPayment) {
    await createNotification({
      recipient: finalPayment.customer,
      title: "Payment Successful",
      message: `Your payment for order ${order.orderNumber} was successful.`,
      type: "PAYMENT_SUCCESS",
      data: {
        orderId: order._id,
        paymentId: finalPayment._id,
      },
    });

    const admins = await User.find({
      role: "ADMIN",
    }).select("_id");

    for (const admin of admins) {
      await createNotification({
        recipient: admin._id,
        title: "New Online Payment",
        message: `Order ${order.orderNumber} has been paid successfully.`,
        type: "NEW_PAYMENT",
        data: {
          orderId: order._id,
          paymentId: finalPayment._id,
        },
      });
    }
  }

  return finalPayment;
};

export const paymentSuccessService = async (sessionId, customerId) => {
  if (typeof sessionId !== "string" || !sessionId.trim()) {
    throw new Error("A valid Stripe session ID is required.");
  }

  const stripe = await getStripeClient();

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const payment = await Payment.findOne({
    stripeSessionId: session.id,
  });

  if (!payment) {
    throw new Error("Payment not found.");
  }

  // Verify that this payment belongs to the logged-in customer.
  if (payment.customer.toString() !== customerId.toString()) {
    throw new Error("Unauthorized.");
  }

  return await processSuccessfulCheckoutSession(session);
};

export const handleStripeWebhookService = async (rawBody, signature) => {
  const stripe = await getStripeClient();
  const webhookSecret = await getDecryptedWebhookSecretService();

  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    const signatureError = new Error("Invalid Stripe webhook signature.");
    signatureError.statusCode = 400;
    throw signatureError;
  }

  // Handle completed checkout sessions and delayed payments
  const supportedEvents = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
  ];

  if (!supportedEvents.includes(event.type)) {
    return {
      received: true,
      processed: false,
    };
  }

  const session = event.data.object;

  // A completed checkout session does not always mean the payment
  // has been paid, particularly with delayed payment methods.
  if (session.payment_status !== "paid") {
    return {
      received: true,
      processed: false,
    };
  }

  await processSuccessfulCheckoutSession(session);

  return {
    received: true,
    processed: true,
  };
};

/** 
export const paymentSuccessService = async (sessionId, customerId) => {
  const stripe = await getStripeClient();
  // Verify checkout session
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    throw new Error("Payment not completed.");
  }

  // Find payment
  const payment = await Payment.findOne({
    stripeSessionId: session.id,
  });

  if (!payment) {
    throw new Error("Payment not found.");
  }

  // Security check
  if (payment.customer.toString() !== customerId.toString()) {
    throw new Error("Unauthorized.");
  }

  // Already processed
  if (payment.status === "PAID") {
    return payment;
  }

  // Retrieve Stripe payment details
  const paymentIntent = await stripe.paymentIntents.retrieve(
    session.payment_intent,
  );

  const paymentMethod = await stripe.paymentMethods.retrieve(
    paymentIntent.payment_method,
  );

  const wallet = paymentMethod.card?.wallet?.type;

  // Detect payment gateway
  if (wallet === "google_pay") {
    payment.gateway = "GOOGLE_PAY";
  } else if (wallet === "apple_pay") {
    payment.gateway = "APPLE_PAY";
  } else if (paymentMethod.type === "link") {
    payment.gateway = "LINK";
  } else {
    payment.gateway = "CARD";
  }

  // Get order
  const order = await Order.findById(payment.order);

  if (!order) {
    throw new Error("Order not found.");
  }

  // Update payment
  payment.status = "PAID";
  payment.transactionId = paymentIntent.id;
  payment.paidAt = new Date();

  await payment.save();

  // Update order
  order.paymentStatus = "PAID";
  order.status = "CONFIRMED";

  await order.save();

  await completeOrderService(order._id);

  // Customer notification
  await createNotification({
    recipient: payment.customer,
    title: "Payment Successful",
    message: `Your payment for order ${order.orderNumber} was successful.`,
    type: "PAYMENT_SUCCESS",
    data: {
      orderId: order._id,
      paymentId: payment._id,
    },
  });

  // Admin notifications
  const admins = await User.find({
    role: "ADMIN",
  });

  for (const admin of admins) {
    await createNotification({
      recipient: admin._id,
      title: "New Online Payment",
      message: `Order ${order.orderNumber} has been paid successfully.`,
      type: "NEW_PAYMENT",
      data: {
        orderId: order._id,
        paymentId: payment._id,
      },
    });
  }

  return payment;
};
*/

//admin
export const getPaymentsService = async ({
  page = 1,
  limit = 10,
  status,
  customer,
  from,
  to,
}) => {
  const filter = {};

  // Payment status filter
  if (status) {
    const allowedStatuses = ["PENDING", "PAID", "FAILED", "REFUNDED"];

    if (!allowedStatuses.includes(status)) {
      throw new Error("Invalid payment status.");
    }

    filter.status = status;
  }

  // Date range filter
  if (from || to) {
    filter.createdAt = {};

    if (from) {
      filter.createdAt.$gte = new Date(from);
    }

    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  // Customer search
  if (typeof customer === "string" && customer.trim()) {
    const normalizedCustomer = customer.trim();

    if (normalizedCustomer.length > 100) {
      throw new Error("Customer search must not exceed 100 characters.");
    }

    const regex = new RegExp(escapeRegex(normalizedCustomer), "i");

    const customers = await User.find({
      $or: [{ fullName: regex }, { email: regex }],
    }).select("_id");

    filter.customer = {
      $in: customers.map((c) => c._id),
    };
  }

  const total = await Payment.countDocuments(filter);

  const payments = await Payment.find(filter)
    .populate("customer", "fullName email phoneNumber")
    .populate("order", "orderNumber total status paymentMethod")
    .sort({
      createdAt: -1,
    })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return {
    payments,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  };
};

export const getPaymentByIdService = async (paymentId) => {
  // Validate payment ID
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw new Error("Invalid payment ID.");
  }

  const payment = await Payment.findById(paymentId)
    .populate("customer", "fullName email phoneNumber")
    .populate({
      path: "order",
      populate: [
        {
          path: "items.product",
          populate: {
            path: "image",
          },
        },
        {
          path: "items.variant",
        },
      ],
    });

  if (!payment) {
    throw new Error("Payment not found.");
  }

  return payment;
};
