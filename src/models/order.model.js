import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: null,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    variantName: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Order must contain at least one item.",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "CARD", "ONLINE"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
    },

    inventoryProcessed: {
      type: Boolean,
      default: false,
    },

    stockReserved: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "READY",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "PENDING",
    },

    deliveryAddress: {
      address: {
        type: String,
        required: true,
        trim: true,
      },

      contactName: {
        type: String,
        required: true,
        trim: true,
      },

      contactPhone: {
        type: String,
        required: true,
        trim: true,
      },

      instructions: {
        type: String,
        default: "",
        trim: true,
      },

      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
          required: true,
        },

        coordinates: {
          type: [Number], // [longitude, latitude]
          required: true,
          validate: {
            validator: (value) => value.length === 2,
            message: "Coordinates must contain [longitude, latitude].",
          },
        },
      },
    },

    cancelledAt: Date,

    completedAt: Date,
  },
  {
    timestamps: true,
  },
);

orderSchema.index({
  "deliveryAddress.location": "2dsphere",
});

const Order = mongoose.model("Order", orderSchema);

export default Order;
