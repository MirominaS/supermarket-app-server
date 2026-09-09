import PaymentSettings from "../models/payment-settings.model.js";
import { encrypt, decrypt } from "../utils/encryption.js";

const SUPPORTED_PROVIDERS = ["STRIPE"];

const DEFAULT_PROVIDER = "STRIPE";

//Save or update payment settings
export const savePaymentSettingsService = async ({
  provider = DEFAULT_PROVIDER,
  secretKey,
  publishableKey,
  webhookSecret,
}) => {
  // Normalize provider
  provider = String(provider).trim().toUpperCase();

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(
      `Unsupported payment provider: ${provider}`,
    );
  }

  // Build update object
  const updateData = {
    provider,
  };

  // Encrypt only the keys that were provided
  if (secretKey !== undefined) {
    if (!secretKey?.trim()) {
      throw new Error(
        "Secret key cannot be empty.",
      );
    }

    updateData.secretKey = encrypt(
      secretKey.trim(),
    );
  }

  if (publishableKey !== undefined) {
    if (!publishableKey?.trim()) {
      throw new Error(
        "Publishable key cannot be empty.",
      );
    }

    updateData.publishableKey = encrypt(
      publishableKey.trim(),
    );
  }

  if (webhookSecret !== undefined) {
    if (!webhookSecret?.trim()) {
      throw new Error(
        "Webhook secret cannot be empty.",
      );
    }

    updateData.webhookSecret = encrypt(
      webhookSecret.trim(),
    );
  }

  // At least one key must be provided
  if (
    secretKey === undefined &&
    publishableKey === undefined &&
    webhookSecret === undefined
  ) {
    throw new Error(
      "At least one payment key is required.",
    );
  }

  // Create or update settings
  const settings =
    await PaymentSettings.findOneAndUpdate(
      {
        provider,
      },
      {
        $set: updateData,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );

  return settings;
};

export const getPaymentSettingsService = async ({
  provider = DEFAULT_PROVIDER,
} = {}) => {
  const normalizedProvider = String(provider).trim().toUpperCase();

  if (!SUPPORTED_PROVIDERS.includes(normalizedProvider)) {
    throw new Error(`Unsupported payment provider: ${normalizedProvider}`);
  }

  const settings = await PaymentSettings.find({
    provider: normalizedProvider,
  })
    .select("_id provider createdAt updatedAt")
    .sort({
      createdAt: -1,
    })
    .lean();

  return settings;
};

export const getDecryptedSecretKeyService = async (
  provider = DEFAULT_PROVIDER,
) => {
  const normalizedProvider = String(provider).trim().toUpperCase();

  if (!SUPPORTED_PROVIDERS.includes(normalizedProvider)) {
    throw new Error(`Unsupported payment provider: ${normalizedProvider}`);
  }

  const settings = await PaymentSettings.findOne({
    provider: normalizedProvider,
  });

  if (!settings) {
    throw new Error(
      `Payment settings for ${normalizedProvider} are not configured.`,
    );
  }

  if (!settings.secretKey) {
    throw new Error(`Secret key for ${normalizedProvider} is not configured.`);
  }

  return decrypt(settings.secretKey);
};
