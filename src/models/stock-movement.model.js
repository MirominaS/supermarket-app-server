import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },

    movementType: {
      type: String,
      enum: ["IN", "OUT", "ADJUSTMENT", "RETURN"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    previousStock: {
      type: Number,
      required: true,
      min: 0,
    },

    currentStock: {
      type: Number,
      required: true,
      min: 0,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    referenceType: {
      type: String,
      enum: [
        "ORDER",
        "PURCHASE",
        "SALE",
        "RETURN",
        "ADJUSTMENT",
      ],
      default: "ADJUSTMENT",
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const StockMovement = mongoose.model(
  "StockMovement",
  stockMovementSchema,
);

export default StockMovement;