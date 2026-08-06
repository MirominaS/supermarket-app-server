import mongoose from "mongoose";

const offerItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const offerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["SINGLE", "COMBO"],
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    items: {
      type: [offerItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          if (this.type === "SINGLE") {
            return items.length === 1;
          }

          if (this.type === "COMBO") {
            return items.length >= 2;
          }

          return false;
        },

        message:
          "SINGLE offers require exactly one product. COMBO offers require at least two products.",
      },
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

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;
