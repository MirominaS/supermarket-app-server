import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    barcode: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    costPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    unit: {
      type: String,
      required: true,
      trim: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
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

// Prevent duplicate variant names within the same product
productVariantSchema.index(
  {
    product: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

const ProductVariant = mongoose.model(
  "ProductVariant",
  productVariantSchema
);

export default ProductVariant;