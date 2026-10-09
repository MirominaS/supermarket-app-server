import { generateOtp, hashOtp, verifyOtp } from "../../utils/otp.helper.js";
import { getCache, setCache, deleteCache } from "../cache.service.js";
import { otpCacheKeys } from "../../utils/otp-cache-key.js";
import { otpResendCacheKeys } from "../../utils/otp-resend-cache-key.js";

const OTP_EXPIRY_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 3;
const OTP_RESEND_COOLDOWN_SECONDS = 3 * 60;
const OTP_RESEND_DAILY_LIMIT = 3;
const OTP_RESEND_WINDOW_SECONDS = 24 * 60 * 60;

// CREATE OTP
export const createOtp = async ({
  email,
  purpose,
  verificationType,
  data = {},
}) => {
  const otp = generateOtp();

  const hashedOtp = await hashOtp(otp);

  const cacheKey = otpCacheKeys.byEmailAndPurpose(
    email,
    purpose,
    verificationType,
  );

  const expiresAt = Date.now() + OTP_EXPIRY_SECONDS * 1000;

  const otpData = {
    ...data,

    email,
    purpose,
    verificationType,
    otp: hashedOtp,
    attempts: 0,

    expiresAt,
  };

  // Remove previous OTP
  await deleteCache(cacheKey);

  // Store OTP in Redis
  await setCache(cacheKey, otpData, OTP_EXPIRY_SECONDS);

  await initializeOtpResendState({
    email,
    purpose,
    verificationType,
  });

  return {
    otp,
  };
};

// VALIDATE OTP
export const validateOtp = async ({
  email,
  otp,
  purpose,
  verificationType,
}) => {
  const cacheKey = otpCacheKeys.byEmailAndPurpose(
    email,
    purpose,
    verificationType,
  );

  const otpData = await getCache(cacheKey);

  if (!otpData) {
    throw new Error("OTP not found or has expired.");
  }

  // Check expiry
  if (Date.now() > otpData.expiresAt) {
    await deleteCache(cacheKey);

    throw new Error("OTP has expired. Please request a new OTP.");
  }

  // Check maximum attempts
  if (otpData.attempts >= MAX_ATTEMPTS) {
    await deleteCache(cacheKey);

    throw new Error("Too many incorrect attempts. Please request a new OTP.");
  }

  // Verify OTP
  const valid = await verifyOtp(otp, otpData.otp);

  if (!valid) {
    otpData.attempts += 1;

    const remaining = MAX_ATTEMPTS - otpData.attempts;

    if (remaining <= 0) {
      await deleteCache(cacheKey);

      throw new Error("Too many incorrect attempts. Please request a new OTP.");
    }

    // Preserve original expiration
    const remainingSeconds = Math.max(
      1,
      Math.ceil((otpData.expiresAt - Date.now()) / 1000),
    );

    await setCache(cacheKey, otpData, remainingSeconds);

    throw new Error(`Invalid OTP. ${remaining} attempt(s) remaining.`);
  }

  return otpData;
};

// DELETE OTP
export const deleteOtp = async ({ email, purpose, verificationType }) => {
  const cacheKey = otpCacheKeys.byEmailAndPurpose(
    email,
    purpose,
    verificationType,
  );

  await deleteCache(cacheKey);
};

export const initializeOtpResendState = async ({
  email,
  purpose,
  verificationType,
}) => {
  const key = otpResendCacheKeys.state(email, purpose, verificationType);

  const existingState = await getCache(key);

  // Do not reset the existing cooldown or resend count.
  if (!existingState) {
    await setCache(
      key,
      {
        lastSentAt: Date.now(),
        resendTimestamps: [],
      },
      OTP_RESEND_WINDOW_SECONDS,
    );
  }
};

export const checkOtpResendAllowed = async ({
  email,
  purpose,
  verificationType,
}) => {
  const key = otpResendCacheKeys.state(email, purpose, verificationType);

  const state = await getCache(key);

  if (!state) {
    throw new Error("Please request an OTP before resending.");
  }

  const now = Date.now();

  const recentResends = (state.resendTimestamps || []).filter(
    (timestamp) => now - timestamp < OTP_RESEND_WINDOW_SECONDS * 1000,
  );

  const elapsedSeconds = Math.floor((now - state.lastSentAt) / 1000);

  if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
    const remainingSeconds = OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;

    throw new Error(
      `Please wait ${remainingSeconds} more seconds before resending OTP.`,
    );
  }

  if (recentResends.length >= OTP_RESEND_DAILY_LIMIT) {
    throw new Error(
      "You have reached the maximum of 3 OTP resends in 24 hours.",
    );
  }

  return {
    key,
    state: {
      ...state,
      resendTimestamps: recentResends,
    },
  };
};

export const recordOtpResend = async ({ key, state }) => {
  const now = Date.now();

  await setCache(
    key,
    {
      lastSentAt: now,
      resendTimestamps: [...state.resendTimestamps, now],
    },
    OTP_RESEND_WINDOW_SECONDS,
  );
};

// Check whether an active OTP already exists
export const ensureNoActiveOtp = async ({
  email,
  purpose,
  verificationType,
}) => {
  const cacheKey = otpCacheKeys.byEmailAndPurpose(
    email,
    purpose,
    verificationType
  );

  const existingOtp = await getCache(cacheKey);

  if (!existingOtp) {
    return;
  }

  if (existingOtp.expiresAt > Date.now()) {
    throw new Error(
      "An OTP has already been sent. Please use the resend OTP option."
    );
  }

  await deleteCache(cacheKey);
};