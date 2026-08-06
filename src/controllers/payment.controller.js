import {
  createOrderCheckoutService,
  paymentSuccessService,
  getPaymentsService,
  getPaymentByIdService,
} from "../services/payment.service.js";

export const createCheckout = async (req, res) => {
  try {
    const { orderId } = req.body;

    const result = await createOrderCheckoutService(req.user._id, orderId);

    res.status(200).json({
      success: true,
      clientSecret: result.clientSecret,
      payment: result.payment,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const paymentSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const payment = await paymentSuccessService(sessionId, req.user._id);

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//admin
export const getPayments = async (req, res) => {
  try {
    const { page, limit, status, customer, from, to } = req.query;

    const result = await getPaymentsService({
      page,
      limit,
      status,
      customer,
      from,
      to,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPaymentById = async (req, res) => {
  try {
    const payment = await getPaymentByIdService(req.params.id);

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
