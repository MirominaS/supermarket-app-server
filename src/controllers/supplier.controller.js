import {
  createSupplierService,
  getSuppliersService,
  getSupplierByIdService,
  updateSupplierService,
  deleteSupplierService,
} from "../services/supplier.service.js";

// Create supplier
export const createSupplier = async (req, res) => {
  try {
    const supplier = await createSupplierService(req.body);

    return res.status(201).json({
      success: true,
      supplier,
    });
  } catch (error) {
    console.error("Create supplier error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all suppliers
export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await getSuppliersService();

    return res.status(200).json({
      success: true,
      suppliers,
    });
  } catch (error) {
    console.error("Get suppliers error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get supplier by ID
export const getSupplierById = async (req, res) => {
  try {
    const supplier = await getSupplierByIdService(req.params.id);

    return res.status(200).json({
      success: true,
      supplier,
    });
  } catch (error) {
    console.error("Get supplier error:", error);

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Update supplier
export const updateSupplier = async (req, res) => {
  try {
    const supplier = await updateSupplierService(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      supplier,
    });
  } catch (error) {
    console.error("Update supplier error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete supplier (Soft Delete)
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await deleteSupplierService(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Supplier deleted successfully.",
      supplier,
    });
  } catch (error) {
    console.error("Delete supplier error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};