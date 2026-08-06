import CustomerOtp from "../../models/customer-otp.model.js";
import { generateOtp, hashOtp, verifyOtp } from "../../utils/otp.helper.js";

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;

export const createOtp = async ({
  email,
  purpose,
  verificationType,
  data = {},
}) => {
  const otp = generateOtp();

  const hashedOtp = await hashOtp(otp);

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await CustomerOtp.deleteMany({
    email,
    purpose,
  });

  const otpRecord = await CustomerOtp.create({
    ...data,

    email,
    purpose,
    verificationType,

    otp: hashedOtp,

    expiresAt,

    attempts: 0,
  });

  return {
    otp,
    otpRecord,
  };
};

export const validateOtp = async ({
  email,
  otp,
  purpose,
  verificationType,
}) => {
  const otpRecord = await CustomerOtp.findOne({
    email,
    purpose,
    verificationType,
  });

  if (!otpRecord) {
    throw new Error("OTP not found or has expired.");
  }

  if (new Date() > otpRecord.expiresAt) {
    await CustomerOtp.deleteOne({
      _id: otpRecord._id,
    });

    throw new Error("OTP has expired. Please request a new OTP.");
  }

  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    await CustomerOtp.deleteOne({
      _id: otpRecord._id,
    });

    throw new Error("Too many incorrect attempts. Please request a new OTP.");
  }

  const valid = await verifyOtp(otp, otpRecord.otp);

  if (!valid) {
    otpRecord.attempts++;

    await otpRecord.save();

    const remaining = MAX_ATTEMPTS - otpRecord.attempts;

    if (remaining <= 0) {
      await CustomerOtp.deleteOne({
        _id: otpRecord._id,
      });

      throw new Error("Too many incorrect attempts. Please request a new OTP.");
    }

    throw new Error(`Invalid OTP. ${remaining} attempt(s) remaining.`);
  }

  return otpRecord;
};

export const deleteOtp = async ({ id }) => {
  await CustomerOtp.deleteOne({
    _id: id,
  });
};
