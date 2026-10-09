export const otpResendCacheKeys = {
  state: (email, purpose, verificationType) =>
    `otp-resend:${purpose}:${verificationType}:${email}`,
};