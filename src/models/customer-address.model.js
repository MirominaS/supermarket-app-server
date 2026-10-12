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

  },
  {
    timestamps: true,
  },
);

export default mongoose.model("CustomerAddress", customerAddressSchema);
