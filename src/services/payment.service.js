import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Payment from "../models/payment.model.js";
import { getStripeClient } from "../config/stripe.js";
import { createNotification } from "./notification.service.js";
import User from "../models/user.model.js";
import { completeOrderService } from "./order-completion.service.js";

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
  if (customer) {
    const regex = new RegExp(customer, "i");

    const customers = await mongoose
      .model("User")
      .find({
        $or: [{ fullName: regex }, { email: regex }],
      })
      .select("_id");

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
