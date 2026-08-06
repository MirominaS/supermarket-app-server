import mongoose from "mongoose";
import Supplier from "../models/supplier.model.js";

export const createSupplierService = async (data) => {
  const supplier = await Supplier.create(data);

  return supplier;
};

export const getSuppliersService = async () => {
  return await Supplier.find().sort({
    createdAt: -1,
  });
};

export const getSupplierByIdService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid supplier ID.");
  }

  const supplier = await Supplier.findById(id);

  if (!supplier) {
    throw new Error("Supplier not found.");
  }

  return supplier;
};

export const updateSupplierService = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid supplier ID.");
  }

  const supplier = await Supplier.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!supplier) {
    throw new Error("Supplier not found.");
  }

  return supplier;
};

export const deleteSupplierService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid supplier ID.");
  }

  const supplier = await Supplier.findById(id);

  if (!supplier) {
    throw new Error("Supplier not found.");
  }

  supplier.isActive = false;

  await supplier.save();

  return supplier;
};