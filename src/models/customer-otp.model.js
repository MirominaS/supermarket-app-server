import mongoose from "mongoose";

const customerOtpSchema = new mongoose.Schema(
  {
    // OTP purpose
    purpose: {
      type: String,
      enum: [
        "REGISTER",
        "FORGOT_PASSWORD",
        "CHANGE_EMAIL",
        "CHANGE_PHONE",
        "DELETE_ACCOUNT",
      ],
      required: true,
    },

    // Registration data
    fullName: {
      type: String,
      trim: true,
      default: null,
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: null,
    },

    newEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    newPhoneNumber: {
      type: String,
      trim: true,
      default: null,
    },

    passwordHash: {
      type: String,
      default: null,
    },

    // Common fields
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    otp: {
      type: String,
      required: true,
    },

    verificationType: {
      type: String,
      enum: ["EMAIL", "PHONE"],
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

customerOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const CustomerOtp = mongoose.model("CustomerOtp", customerOtpSchema);

export default CustomerOtp;
