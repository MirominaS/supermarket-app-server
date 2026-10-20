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

    specialInstruction: {
      type: String,
      trim: true,
      default: "",
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: null,
      },

      coordinates: {
        type: [Number],
        default: null,
        validate: {
          validator(value) {
            if (!Array.isArray(value) || value.length !== 2) {
              return false;
            }

            const [longitude, latitude] = value;

            return (
              Number.isFinite(longitude) &&
              Number.isFinite(latitude) &&
              longitude >= -180 &&
              longitude <= 180 &&
              latitude >= -90 &&
              latitude <= 90
            );
          },
          message: "Valid [longitude, latitude] coordinates are required.",
        },
      },
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("CustomerAddress", customerAddressSchema);
