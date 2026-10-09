import express from "express";

import {
  requestRegisterOtp,
  resendRegistrationOtp,
  verifyRegisterOtp,
  loginCustomer,
  refreshCustomerAccessToken,
  logoutCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  requestForgotPasswordOtp,
  resendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetForgotPassword,
  changePassword,
  deleteAccount,
  requestChangePhoneOtp,
  resendChangePhoneOtp,
  verifyChangePhoneOtp,
  changePhoneNumber,
  googleLogin,
} from "../controllers/customer-auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/request-otp", requestRegisterOtp);
router.post("/register/resend-otp", resendRegistrationOtp);
router.post("/verify-otp", verifyRegisterOtp);

router.post("/login", loginCustomer);
router.post(
  "/logout",
  authenticate,
  authorizeRoles("CUSTOMER"),
  logoutCustomer,
);

router.post("/refresh", refreshCustomerAccessToken);

router.post("/google", googleLogin);

router.get(
  "/profile",
  authenticate,
  authorizeRoles("CUSTOMER"),
  getCustomerProfile,
);

router.put(
  "/profile",
  authenticate,
  authorizeRoles("CUSTOMER"),
  updateCustomerProfile,
);

router.post("/forgot-password/request-otp", requestForgotPasswordOtp);
router.post("/forgot-password/resend-otp", resendForgotPasswordOtp);
router.post("/forgot-password/verify-otp", verifyForgotPasswordOtp);
router.post("/forgot-password/reset", resetForgotPassword);

router.post(
  "/change-password",
  authenticate,
  authorizeRoles("CUSTOMER"),
  changePassword,
);

router.delete(
  "/delete-account",
  authenticate,
  authorizeRoles("CUSTOMER"),
  deleteAccount,
);

router.post(
  "/change-phone/request",
  authenticate,
  authorizeRoles("CUSTOMER"),
  requestChangePhoneOtp,
);

router.post(
  "/change-phone/resend-otp",
  authenticate,
  authorizeRoles("CUSTOMER"),
  resendChangePhoneOtp
);

router.post(
  "/change-phone/verify",
  authenticate,
  authorizeRoles("CUSTOMER"),
  verifyChangePhoneOtp,
);

router.post(
  "/change-phone/confirm",
  authenticate,
  authorizeRoles("CUSTOMER"),
  changePhoneNumber,
);

export default router;
