import {
  createCustomerAddressService,
  getCustomerAddressesService,
  getCustomerAddressByIdService,
  updateCustomerAddressService,
  setDefaultCustomerAddressService,
  deleteCustomerAddressService,
} from "../services/customer-address.service.js";

// CREATE ADDRESS
export const createCustomerAddress = async (req, res) => {
  try {
    const address = await createCustomerAddressService(
      req.user._id,
      req.body,
    );

    res.status(201).json({
      success: true,
      message: "Address created successfully.",
      address,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL CUSTOMER ADDRESSES
export const getCustomerAddresses = async (req, res) => {
  try {
    const addresses = await getCustomerAddressesService(
      req.user._id,
    );

    res.status(200).json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ADDRESS BY ID
export const getCustomerAddressById = async (req, res) => {
  try {
    const address = await getCustomerAddressByIdService(
      req.user._id,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      address,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE ADDRESS
export const updateCustomerAddress = async (req, res) => {
  try {
    const address = await updateCustomerAddressService(
      req.user._id,
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Address updated successfully.",
      address,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// SET DEFAULT ADDRESS
export const setDefaultCustomerAddress = async (req, res) => {
  try {
    const result = await setDefaultCustomerAddressService(
      req.user._id,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: result.message,
      address: result.address,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE ADDRESS
export const deleteCustomerAddress = async (req, res) => {
  try {
    const result = await deleteCustomerAddressService(
      req.user._id,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};