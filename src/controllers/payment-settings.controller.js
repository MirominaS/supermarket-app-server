import {
  savePaymentSettingsService,
  getPaymentSettingsService,
} from "../services/payment-settings.service.js";

export const savePaymentSettings = async (
  req,
  res,
) => {
  try {
    const {
      provider,
      secretKey,
      publishableKey,
      webhookSecret,
    } = req.body;

    const settings =
      await savePaymentSettingsService({
        provider,
        secretKey,
        publishableKey,
        webhookSecret,
      });

    res.status(200).json({
      success: true,
      message:
        "Payment settings saved successfully.",
      settings: {
        id: settings._id,
        provider: settings.provider,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPaymentSettings = async (
  req,
  res,
) => {
  try {
    const { provider } = req.query;

    const settings =
      await getPaymentSettingsService({
        provider,
      });

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};