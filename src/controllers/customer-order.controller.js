import {
  createCustomerOrderService,
  getCustomerOrdersService,
  getCustomerOrderByIdService,
  cancelCustomerOrderService,
} from "../services/customer-order.service.js";

export const createCustomerOrder = async (req, res) => {
  try {
    const { paymentMethod, deliveryAddress } = req.body;

    if (!paymentMethod || !deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: "Payment method and delivery address are required.",
      });
    }

    const order = await createCustomerOrderService({
      customerId: req.user._id,
      paymentMethod,
      deliveryAddress,
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      order,
    });
  } catch (error) {
    console.error("Create customer order error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCustomerOrders = async (req, res) => {
  try {
    const orders = await getCustomerOrdersService({
      customerId: req.user._id,
      status: req.query.status,
    });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get customer orders error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCustomerOrderById = async (req, res) => {
  try {
    const order = await getCustomerOrderByIdService(
      req.user._id,
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get customer order error:", error);

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

export const cancelCustomerOrder = async (req, res) => {
  try {
    const order = await cancelCustomerOrderService(req.user._id, req.params.id);

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      order,
    });
  } catch (error) {
    console.error("Cancel customer order error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
