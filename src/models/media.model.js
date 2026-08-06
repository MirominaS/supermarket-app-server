import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: ["image"],
      required: true,
    },

    folder: {
      type: String,
      enum: [
        "product-images",
        "customer-profile-images",
      ],
      required: true,
    },

    visibility: {
      type: String,
      enum: ["public", "private"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Media = mongoose.model("Media", mediaSchema);

export default Media;