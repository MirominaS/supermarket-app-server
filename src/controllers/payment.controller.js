import {
  createOrderCheckoutService,
  paymentSuccessService,
  getPaymentsService,
  getPaymentByIdService,
   handleStripeWebhookService,
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

export const stripeWebhook = async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"];

    if (!signature || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Stripe signature or raw request body is missing.",
      });
    }

    const result = await handleStripeWebhookService(
      req.body,
      signature,
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Stripe webhook error:", error.message);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode === 400
        ? error.message
        : "Webhook processing failed. Stripe can retry this event.",
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
