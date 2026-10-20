import {
  createCustomerOrderService,
  getCustomerOrdersService,
  getCustomerOrderByIdService,
  cancelCustomerOrderService,
} from "../services/customer-order.service.js";

//create customer order

export const createCustomerOrder = async (req, res) => {
  try {
    const {
      items,
      paymentMethod,
      fulfillmentType,
      deliveryAddressId,
      deliveryAddress,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items are required.",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required.",
      });
    }

    if (!fulfillmentType) {
      return res.status(400).json({
        success: false,
        message: "Fulfillment type is required.",
      });
    }

    const order = await createCustomerOrderService({
      customerId: req.user._id,
      items,
      paymentMethod,
      fulfillmentType,
      deliveryAddressId, 
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

// get customer orders
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

// get customer order by id
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

// cancel customer order
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
