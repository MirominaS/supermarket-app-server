export const otpCacheKeys = {
  byEmailAndPurpose: (email, purpose, verificationType) =>
    `otp:${purpose}:${verificationType}:${email}`,
};
