export const passwordResetCacheKeys = {
  verificationToken: (token) =>
    `password-reset:verification:${token}`,
};