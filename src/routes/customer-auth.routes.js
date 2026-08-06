import express from "express";

import {
  requestRegisterOtp,
  verifyRegisterOtp,
  loginCustomer,
  logoutCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  requestForgotPasswordOtp,
  resetForgotPassword,
  changePassword,
  requestDeleteAccountOtp,
  deleteAccount,
  requestChangeEmailOtp,
  verifyChangeEmailOtp,
  requestChangePhoneOtp,
  verifyChangePhoneOtp,
  googleLogin, 
} from "../controllers/customer-auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/request-otp", requestRegisterOtp);
router.post("/verify-otp", verifyRegisterOtp);

router.post("/login", loginCustomer);
router.post(
  "/logout",
  authenticate,
  authorizeRoles("CUSTOMER"),
  logoutCustomer, 
);

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
router.post("/forgot-password/reset", resetForgotPassword);

router.post(
  "/change-password",
  authenticate,
  authorizeRoles("CUSTOMER"),
  changePassword,
);

router.post(
  "/delete-account/request-otp",
  authenticate,
  authorizeRoles("CUSTOMER"),
  requestDeleteAccountOtp,
);

router.delete(
  "/delete-account",
  authenticate,
  authorizeRoles("CUSTOMER"),
  deleteAccount,
);

router.post(
  "/change-email/request",
  authenticate,
  authorizeRoles("CUSTOMER"),
  requestChangeEmailOtp,
);

router.post(
  "/change-email/verify",
  authenticate,
  authorizeRoles("CUSTOMER"),
  verifyChangeEmailOtp,
);

router.post(
  "/change-phone/request",
  authenticate,
  authorizeRoles("CUSTOMER"),
  requestChangePhoneOtp,
);

router.post(
  "/change-phone/verify",
  authenticate,
  authorizeRoles("CUSTOMER"),
  verifyChangePhoneOtp,
);

export default router;
