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
      default: null,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    variantName: {
      type: String,
      default: null,
      trim: true,
    },

    sku: {
      type: String,
      default: null,
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

const deliveryAddressSchema = new mongoose.Schema(
  {
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
      },

      coordinates: {
        type: [Number],
        validate: {
          validator(value) {
            return value === null || value.length === 2;
          },
          message: "Coordinates must contain [longitude, latitude].",
        },
      },
    },
  },
  { _id: false },
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
      enum: ["PENDING", "PAID", "FAILED","REFUND_PENDING", "REFUNDED"],
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
        "OUT_FOR_DELIVERY",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "PENDING",
    },

    fulfillmentType: {
      type: String,
      enum: ["TAKEAWAY", "DELIVERY"],
      default: "DELIVERY",
      required: true,
    },

    deliveryAddress: {
      type: deliveryAddressSchema,

      required: function () {
        return this.fulfillmentType === "DELIVERY";
      },

      default: undefined,
    },

    cancelledAt: Date,

    //soft-delete fields
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

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
