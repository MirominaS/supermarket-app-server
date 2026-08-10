import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
      default: null,
    },

    hasVariants: {
      type: Boolean,
      default: false,
    },

    // Used only when hasVariants = false
    price: {
      type: Number,
      default: null,
      min: 0,
    },

    costPrice: {
      type: Number,
      default: null,
      min: 0,
    },

    stock: {
      type: Number,
      default: null,
      min: 0,
    },

    unit: {
      type: String,
      default: null,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Product = mongoose.model("Product", productSchema);

export default Product;
