import CustomerAddress from "../models/customer-address.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

export const createCustomerAddressService = async (
  userId,
  {
    label,
    houseNumber,
    street,
    landmark,
    city,
    postalCode,
    country,
    specialInstruction,
    latitude,
    longitude,
    isDefault,
  },
) => {
  // Validate required fields
  if (
    !label ||
    !houseNumber ||
    !street ||
    !city ||
    latitude === undefined ||
    longitude === undefined
  ) {
    throw new Error(
      "Label, house number, street, city, latitude and longitude are required.",
    );
  }

  // Find customer
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  // Remove previous default address
  if (isDefault) {
    await CustomerAddress.updateMany(
      {
        customer: userId,
      },
      {
        isDefault: false,
      },
    );
  }

  // If this is the customer's first address,
  // automatically make it default
  const addressCount = await CustomerAddress.countDocuments({
    customer: userId,
  });

  const address = await CustomerAddress.create({
    customer: userId,

    label: label.trim(),

    houseNumber: houseNumber.trim(),

    street: street.trim(),

    landmark: landmark?.trim() || "",

    city: city.trim(),

    postalCode: postalCode?.trim() || "",

    country: country?.trim() || "Sri Lanka",

    specialInstruction: specialInstruction?.trim() || "",

    location: {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)],
    },

    isDefault: addressCount === 0 ? true : Boolean(isDefault),
  });

  return address;
};

export const getCustomerAddressesService = async (userId) => {
  // Validate customer ID
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid customer ID.");
  }

  // Find customer
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  // Get customer addresses
  const addresses = await CustomerAddress.find({
    customer: userId,
  }).sort({
    isDefault: -1,
    createdAt: -1,
  });

  return addresses;
};

export const getCustomerAddressByIdService = async (userId, addressId) => {
  // Validate address ID
  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    throw new Error("Invalid address ID.");
  }

  // Find customer
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  // Find address
  const address = await CustomerAddress.findOne({
    _id: addressId,
    customer: userId,
  });

  if (!address) {
    throw new Error("Address not found.");
  }

  return address;
};

export const updateCustomerAddressService = async (
  userId,
  addressId,
  {
    label,
    houseNumber,
    street,
    landmark,
    city,
    postalCode,
    country,
    specialInstruction,
    latitude,
    longitude,
    isDefault,
  },
) => {
  // Validate address ID
  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    throw new Error("Invalid address ID.");
  }

  // Find customer
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  // Find address
  const address = await CustomerAddress.findOne({
    _id: addressId,
    customer: userId,
  });

  if (!address) {
    throw new Error("Address not found.");
  }

  // Update label
  if (label !== undefined) {
    const value = label.trim();

    if (!value) {
      throw new Error("Label is required.");
    }

    address.label = value;
  }

  // Update house number
  if (houseNumber !== undefined) {
    const value = houseNumber.trim();

    if (!value) {
      throw new Error("House number is required.");
    }

    address.houseNumber = value;
  }

  // Update street
  if (street !== undefined) {
    const value = street.trim();

    if (!value) {
      throw new Error("Street is required.");
    }

    address.street = value;
  }

  // Update landmark
  if (landmark !== undefined) {
    address.landmark = landmark.trim();
  }

  // Update city
  if (city !== undefined) {
    const value = city.trim();

    if (!value) {
      throw new Error("City is required.");
    }

    address.city = value;
  }

  // Update postal code
  if (postalCode !== undefined) {
    address.postalCode = postalCode.trim();
  }

  // Update country
  if (country !== undefined) {
    const value = country.trim();

    if (!value) {
      throw new Error("Country is required.");
    }

    address.country = value;
  }

  // Update special instruction
  if (specialInstruction !== undefined) {
    address.specialInstruction = specialInstruction.trim();
  }

  // Update location
  if (latitude !== undefined && longitude !== undefined) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new Error("Invalid latitude.");
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw new Error("Invalid longitude.");
    }

    address.location = {
      type: "Point",
      coordinates: [lng, lat],
    };
  }

  // Update default address
  if (isDefault === true && !address.isDefault) {
    await CustomerAddress.updateMany(
      {
        customer: userId,
      },
      {
        isDefault: false,
      },
    );

    address.isDefault = true;
  }

  await address.save();

  return address;
};

export const setDefaultCustomerAddressService = async (userId, addressId) => {
  // Validate address ID
  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    throw new Error("Invalid address ID.");
  }

  // Find customer
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  // Find address
  const address = await CustomerAddress.findOne({
    _id: addressId,
    customer: userId,
  });

  if (!address) {
    throw new Error("Address not found.");
  }

  // Already default
  if (address.isDefault) {
    return {
      message: "This address is already the default address.",
    };
  }

  // Remove existing default address
  await CustomerAddress.updateMany(
    {
      customer: userId,
    },
    {
      isDefault: false,
    },
  );

  // Set selected address as default
  address.isDefault = true;

  await address.save();

  return {
    message: "Default address updated successfully.",
    address,
  };
};


export const deleteCustomerAddressService = async (
  userId,
  addressId,
) => {
  // Validate address ID
  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    throw new Error("Invalid address ID.");
  }

  // Find customer
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  // Find address
  const address = await CustomerAddress.findOne({
    _id: addressId,
    customer: userId,
  });

  if (!address) {
    throw new Error("Address not found.");
  }

  const wasDefault = address.isDefault;

  // Delete address
  await CustomerAddress.deleteOne({
    _id: address._id,
  });

  // If deleted address was default,
  // assign another address as default
  if (wasDefault) {
    const nextDefaultAddress = await CustomerAddress.findOne({
      customer: userId,
    }).sort({
      createdAt: -1,
    });

    if (nextDefaultAddress) {
      nextDefaultAddress.isDefault = true;

      await nextDefaultAddress.save();
    }
  }

  return {
    message: "Address deleted successfully.",
  };
};