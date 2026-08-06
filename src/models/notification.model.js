import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "ORDER",
        "PAYMENT",
        "ACCOUNT",
        "PROMOTION",
        "SYSTEM",
      ],
      required: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    data: {
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        default: null,
      },

      paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
        default: null,
      },

      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Notification",
  notificationSchema
);