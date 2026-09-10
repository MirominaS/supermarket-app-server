import mongoose from "mongoose";

const paymentSettingsSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      default: "STRIPE",
    },

    secretKey: {
      type: String,
      default: null,
    },

    publishableKey: {
      type: String,
      default: null,
    },

    webhookSecret: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model(
  "PaymentSettings",
  paymentSettingsSchema,
);