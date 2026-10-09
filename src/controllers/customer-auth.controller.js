import {
  requestCustomerRegistrationOtp,
  resendCustomerRegistrationOtp,
  verifyCustomerRegistrationOtp,
  loginCustomerService,
  refreshCustomerAccessTokenService,
  getCustomerProfileService,
  updateCustomerProfileService,
  requestForgotPasswordOtpService,
  resendForgotPasswordOtpService,
  verifyForgotPasswordOtpService,
  resetForgotPasswordService,
  changePasswordService,
  deleteAccountService,
  requestChangePhoneOtpService,
  resendChangePhoneOtpService,
  verifyChangePhoneOtpService,
  changePhoneNumberService,
  googleLoginService,
} from "../services/customer-auth.service.js";

import { hashToken } from "../utils/hash-token.js";
import RefreshToken from "../models/refresh-token.model.js";

// Request Customer Registration OTP
export const requestRegisterOtp = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, verificationType } =
      req.body;

    const result = await requestCustomerRegistrationOtp({
      fullName,
      email,
      phoneNumber,
      password,
      verificationType,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      verificationType: result.verificationType,
      email: result.email,
      phoneNumber: result.phoneNumber,
    });
  } catch (error) {
    console.error("Request registration OTP error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const resendRegistrationOtp = async (req, res, next) => {
  try {
    const result = await resendCustomerRegistrationOtp(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

// Verify Customer Registration OTP
export const verifyRegisterOtp = async (req, res) => {
  try {
    const { email, otp, verificationType } = req.body;

    const customer = await verifyCustomerRegistrationOtp({
      email,
      otp,
      verificationType,
    });

    return res.status(201).json({
      success: true,
      message: "OTP verified successfully. Customer account created.",
      accessToken: customer.accessToken,
      refreshToken: customer.refreshToken,
      customer: customer.customer,
    });
  } catch (error) {
    console.error("Verify registration OTP error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Customer Login
export const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await loginCustomerService({
      email,
      password,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      customer: result.customer,
    });
  } catch (error) {
    console.error("Customer login error:", error);

    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

export const refreshCustomerAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const result = await refreshCustomerAccessTokenService({
      refreshToken,
    });

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully.",
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error("Customer refresh token error:", error);

    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

//LOGOUT
export const logoutCustomer = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    // Hash the refresh token
    const refreshTokenHash = hashToken(refreshToken);

    // Delete it from database
    await RefreshToken.deleteOne({
      tokenHash: refreshTokenHash,
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Customer logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Logout failed.",
    });
  }
};

// Get Customer Profile
export const getCustomerProfile = async (req, res) => {
  try {
    const customer = await getCustomerProfileService(req.user._id);

    return res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Get customer profile error:", error);

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Customer Profile
export const updateCustomerProfile = async (req, res) => {
  try {
    const result = await updateCustomerProfileService(req.user._id, req.body);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      customer: result,
    });
  } catch (error) {
    console.error("Update customer profile error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//request Forgot password OTP
export const requestForgotPasswordOtp = async (req, res) => {
  try {
    const result = await requestForgotPasswordOtpService(req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const resendForgotPasswordOtp = async (req, res, next) => {
  try {
    const result = await resendForgotPasswordOtpService(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

//verify forget password OTP
export const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const result = await verifyForgotPasswordOtpService(req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
      resetToken: result.resetToken,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//reset Forgot password
export const resetForgotPassword = async (req, res) => {
  try {
    const result = await resetForgotPasswordService(req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
//change password
export const changePassword = async (req, res) => {
  try {
    const result = await changePasswordService(req.user._id, req.body);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Account
export const deleteAccount = async (req, res) => {
  try {
    const result = await deleteAccountService(req.user._id, req.body);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// REQUEST CHANGE PHONE OTP
export const requestChangePhoneOtp = async (req, res) => {
  try {
    const result = await requestChangePhoneOtpService(req.user._id);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Request change phone OTP error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const resendChangePhoneOtp = async (req, res, next) => {
  try {
    const result = await resendChangePhoneOtpService(req.user._id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

// VERIFY CHANGE PHONE OTP
export const verifyChangePhoneOtp = async (req, res) => {
  try {
    const result = await verifyChangePhoneOtpService(req.user._id, req.body);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Verify change phone OTP error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// CHANGE PHONE NUMBER
export const changePhoneNumber = async (req, res) => {
  try {
    const result = await changePhoneNumberService(req.user._id, req.body);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Change phone number error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GOOGLE LOGIN
export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    const result = await googleLoginService({
      idToken,
    });

    return res.status(200).json({
      success: true,
      message: "Google login successful.",
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      customer: result.customer,
    });
  } catch (error) {
    console.error("Google login error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
