import { generateOtp, hashOtp, verifyOtp } from "../../utils/otp.helper.js";
import {
  getCache,
  setCache,
  deleteCache,
} from "../cache.service.js";
import { otpCacheKeys } from "../../utils/otp-cache-key.js";

const OTP_EXPIRY_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 3;

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

  const expiresAt =
    Date.now() + OTP_EXPIRY_SECONDS * 1000;

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
  await setCache(
    cacheKey,
    otpData,
    OTP_EXPIRY_SECONDS,
  );

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
    throw new Error(
      "OTP not found or has expired.",
    );
  }

  // Check expiry
  if (Date.now() > otpData.expiresAt) {
    await deleteCache(cacheKey);

    throw new Error(
      "OTP has expired. Please request a new OTP.",
    );
  }

  // Check maximum attempts
  if (otpData.attempts >= MAX_ATTEMPTS) {
    await deleteCache(cacheKey);

    throw new Error(
      "Too many incorrect attempts. Please request a new OTP.",
    );
  }

  // Verify OTP
  const valid = await verifyOtp(
    otp,
    otpData.otp,
  );

  if (!valid) {
    otpData.attempts += 1;

    const remaining =
      MAX_ATTEMPTS - otpData.attempts;

    if (remaining <= 0) {
      await deleteCache(cacheKey);

      throw new Error(
        "Too many incorrect attempts. Please request a new OTP.",
      );
    }

    // Preserve original expiration
    const remainingSeconds = Math.max(
      1,
      Math.ceil(
        (otpData.expiresAt - Date.now()) / 1000,
      ),
    );

    await setCache(
      cacheKey,
      otpData,
      remainingSeconds,
    );

    throw new Error(
      `Invalid OTP. ${remaining} attempt(s) remaining.`,
    );
  }

  return otpData;
};

// DELETE OTP
export const deleteOtp = async ({
  email,
  purpose,
  verificationType,
}) => {
  const cacheKey = otpCacheKeys.byEmailAndPurpose(
    email,
    purpose,
    verificationType,
  );

  await deleteCache(cacheKey);
};
