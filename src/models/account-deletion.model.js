import mongoose from "mongoose";

const accountDeletionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    reason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const AccountDeletion = mongoose.model(
  "AccountDeletion",
  accountDeletionSchema,
);

export default AccountDeletion;