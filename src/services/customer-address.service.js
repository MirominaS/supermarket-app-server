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
    specialInstruction,
    isDefault,
  },
) => {
  // Validate required fields
  if (
     !label?.trim() ||
    !houseNumber?.trim() ||
    !street?.trim() ||
    !city?.trim()
  ) {
    throw new Error(
      "Label, house number, street, city are required.",
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

  const address = await CustomerAddress.create({
    customer: userId,
    label: label.trim(),
    houseNumber: houseNumber.trim(),
    street: street.trim(),
    landmark: landmark?.trim() || "",
    city: city.trim(),
    specialInstruction: specialInstruction?.trim() || "",
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
    specialInstruction,
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

  // Update special instruction
  if (specialInstruction !== undefined) {
    address.specialInstruction = specialInstruction.trim();
  }


  await address.save();

  return address;
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

 
  // Delete address
  await CustomerAddress.deleteOne({
    _id: address._id,
  });

  return {
    message: "Address deleted successfully.",
  };
};