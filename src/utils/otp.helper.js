import bcrypt from "bcryptjs";
import crypto from "crypto";

// Generate a 6-digit OTP
export const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Hash OTP before storing it in the database
export const hashOtp = async (otp) => {
  return await bcrypt.hash(otp, 10);
};

// Compare entered OTP with the hashed OTP
export const verifyOtp = async (otp, hashedOtp) => {
  return await bcrypt.compare(otp, hashedOtp);
};