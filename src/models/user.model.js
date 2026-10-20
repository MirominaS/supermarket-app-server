
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      required: function () {
        return ["ADMIN", "CUSTOMER"].includes(this.role);
      },
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: undefined,
      required: function () {
        return ["ADMIN", "CUSTOMER"].includes(this.role);
      },
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: undefined,
    },

    username: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined,
    },

    managerName: {
      type: String,
      trim: true,
      default: null,
    },

    password: {
      type: String,
      default: null,
      select: false,
    },

    googleId: {
      type: String,
      default: null,
      index: true,
    },

    profileImage: {
      type: String,
      default: null,
    },

    gender: {
      type: String,
      trim: true,
      default: null,
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    authProvider: {
      type: String,
      enum: ["LOCAL", "GOOGLE"],
      default: "LOCAL",
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["ADMIN", "MANAGER", "CASHIER", "CUSTOMER"],
      default: "CUSTOMER",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Only enforce uniqueness when a value is provided.
userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string" } },
  }
);

userSchema.index(
  { phoneNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { phoneNumber: { $type: "string" } },
  }
);

userSchema.index(
  { username: 1 },
  {
    unique: true,
    partialFilterExpression: { username: { $type: "string" } },
  }
);

const User = mongoose.model("User", userSchema);

export default User;
