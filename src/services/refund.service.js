
import mongoose from "mongoose";
import Payment from "../models/payment.model.js";
import Order from "../models/order.model.js";
import Sale from "../models/sale.model.js";
import { getStripeClient } from "../config/stripe.js";

export const refundOrderPaymentService = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order ID.");
  }

  const payment = await Payment.findOne({
    order: orderId,
    status: { $in: ["REFUND_PENDING", "REFUNDED"] },
  });

  // No refund is needed if no paid online payment exists.
  if (!payment) {
    return {
      refunded: false,
      message: "No pending refund was found for this order.",
    };
  }

  // Make retries safe.
  if (payment.status === "REFUNDED") {
    return {
      refunded: true,
      message: "Payment has already been refunded.",
    };
  }

  if (!payment.transactionId) {
    throw new Error(
      "Cannot refund: Stripe Payment Intent ID is missing.",
    );
  }

  const stripe = await getStripeClient();

  // Stripe's idempotency key prevents duplicate refunds on retries.
  const refund = await stripe.refunds.create(
    {
      payment_intent: payment.transactionId,
    },
    {
      idempotencyKey: `refund-order-${orderId}`,
    },
  );

  if (!["succeeded", "pending"].includes(refund.status)) {
    throw new Error(
      `Stripe refund was not successful. Status: ${refund.status}`,
    );
  }

  // Stripe may return pending for some payment methods.
  if (refund.status === "pending") {
    return {
      refunded: false,
      pending: true,
      message: "Stripe accepted the refund, but it is still pending.",
    };
  }

  // Update our database only after Stripe reports success.
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const currentPayment = await Payment.findById(payment._id)
        .session(session);

      if (!currentPayment) {
        throw new Error("Payment not found.");
      }

      if (currentPayment.status === "REFUNDED") {
        return;
      }

      currentPayment.status = "REFUNDED";
      currentPayment.refundedAt = new Date();
      await currentPayment.save({ session });

      await Order.updateOne(
        { _id: orderId },
        { $set: { paymentStatus: "REFUNDED" } },
        { session },
      );

      await Sale.updateOne(
        { order: orderId },
        { $set: { paymentStatus: "REFUNDED" } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return {
    refunded: true,
    message: "Payment refunded successfully.",
  };
};
