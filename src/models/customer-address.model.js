import mongoose from "mongoose";

const customerAddressSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
      // Home, Office, Hotel, Apartment, Grandma, etc.
    },

    houseNumber: {
      type: String,
      required: true,
      trim: true,
    },

    street: {
      type: String,
      required: true,
      trim: true,
    },

    landmark: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    postalCode: {
      type: String,
      trim: true,
      default: "",
    },

    country: {
      type: String,
      required: true,
      default: "Sri Lanka",
    },

    specialInstruction: {
      type: String,
      trim: true,
      default: "",
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (value) => value.length === 2,
          message: "Coordinates must contain longitude and latitude.",
        },
      },
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

customerAddressSchema.index({
  location: "2dsphere",
});

export default mongoose.model("CustomerAddress", customerAddressSchema);
