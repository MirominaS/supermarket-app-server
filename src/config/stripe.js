import Stripe from "stripe";
import {
  getDecryptedSecretKeyService,
} from "../services/payment-settings.service.js";

export const getStripeClient = async () => {
  const settings =
    await getDecryptedSecretKeyService();

  if (!settings?.secretKey) {
    throw new Error(
      "Stripe secret key is not configured.",
    );
  }

  return new Stripe(settings.secretKey);
};