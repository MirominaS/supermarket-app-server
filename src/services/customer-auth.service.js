import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/user.model.js";
import { sendOtpEmail } from "../utils/mail.helper.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { hashToken } from "../utils/hash-token.js";
import RefreshToken from "../models/refresh-token.model.js";
import {
  createOtp,
  validateOtp,
  deleteOtp,
  checkOtpResendAllowed,
  recordOtpResend,
  ensureNoActiveOtp,
} from "./otp/customer-otp.service.js";

import { otpCacheKeys } from "../utils/otp-cache-key.js";

import { getCache, setCache } from "./cache.service.js";
import { normalizePhoneNumber } from "../utils/phone.helper.js";
import { OAuth2Client } from "google-auth-library";
import { createNotification } from "./notification.service.js";
import { validatePassword } from "../utils/password.helper.js";
import AccountDeletion from "../models/account-deletion.model.js";
import { passwordResetCacheKeys } from "../utils/password-reset-cache-key.js";
import { phoneChangeCacheKeys } from "../utils/phone-change-cache-key.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// REQUEST CUSTOMER REGISTRATION OTP
export const requestCustomerRegistrationOtp = async ({
  fullName,
  email,
  phoneNumber,
  password,
  verificationType,
}) => {
  // Validate required fields
  if (!fullName || !email || !phoneNumber || !password || !verificationType) {
    throw new Error(
      "Full name, email, phone number, password and verification type are required.",
    );
  }
  // Normalize values
  const normalizedFullName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
  const normalizedVerificationType = verificationType.trim().toUpperCase();

  // Validate verification type
  if (!["EMAIL", "PHONE"].includes(normalizedVerificationType)) {
    throw new Error("Verification type must be EMAIL or PHONE.");
  }

  validatePassword(password);

  // Check existing email
  const existingEmail = await User.findOne({
    email: normalizedEmail,
  });

  if (existingEmail) {
    throw new Error("An account with this email already exists.");
  }
  //Check existing phone number
  const existingPhone = await User.findOne({
    phoneNumber: normalizedPhoneNumber,
  });

  if (existingPhone) {
    throw new Error("An account with this phone number already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await ensureNoActiveOtp({
    email: normalizedEmail,
    purpose: "REGISTER",
    verificationType: normalizedVerificationType,
  });

  const { otp } = await createOtp({
    email: normalizedEmail,
    purpose: "REGISTER",
    verificationType: normalizedVerificationType,
    data: {
      fullName: normalizedFullName,
      phoneNumber: normalizedPhoneNumber,
      passwordHash,
    },
  });

  // Send OTP
  if (normalizedVerificationType === "EMAIL") {
    await sendOtpEmail({
      recipientEmail: normalizedEmail,
      recipientName: normalizedFullName,
      otp,
    });
  }

  //Return response
  return {
    email: normalizedEmail,
    phoneNumber: normalizedPhoneNumber,
    verificationType: normalizedVerificationType,
    message:
      normalizedVerificationType === "EMAIL"
        ? "OTP sent successfully to your email."
        : "OTP generated successfully. Phone SMS sending will be added later.",
  };
};

export const resendCustomerRegistrationOtp = async ({
  email,
  verificationType,
}) => {
  if (!email || !verificationType) {
    throw new Error("Email and verification type are required.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedVerificationType = verificationType.trim().toUpperCase();

  if (!["EMAIL", "PHONE"].includes(normalizedVerificationType)) {
    throw new Error("Verification type must be EMAIL or PHONE.");
  }

  if (normalizedVerificationType === "PHONE") {
    throw new Error("Phone SMS delivery is not implemented yet.");
  }

  const purpose = "REGISTER";

  const resendState = await checkOtpResendAllowed({
    email: normalizedEmail,
    purpose,
    verificationType: normalizedVerificationType,
  });

  // Retrieve the existing pending registration details.
  const cacheKey = otpCacheKeys.byEmailAndPurpose(
    normalizedEmail,
    purpose,
    normalizedVerificationType,
  );

  const pendingRegistration = await getCache(cacheKey);

  if (!pendingRegistration) {
    throw new Error(
      "Registration details have expired. Please submit the registration form again.",
    );
  }

  const { otp } = await createOtp({
    email: normalizedEmail,
    purpose,
    verificationType: normalizedVerificationType,
    data: {
      fullName: pendingRegistration.fullName,
      phoneNumber: pendingRegistration.phoneNumber,
      passwordHash: pendingRegistration.passwordHash,
    },
  });

  await sendOtpEmail({
    recipientEmail: normalizedEmail,
    recipientName: pendingRegistration.fullName,
    otp,
  });

  await recordOtpResend(resendState);

  return {
    message: "A new registration OTP has been sent to your email.",
  };
};

// VERIFY CUSTOMER REGISTRATION OTP
export const verifyCustomerRegistrationOtp = async ({
  email,
  otp,
  verificationType,
}) => {
  // Validate required fields
  if (!email || !otp || !verificationType) {
    throw new Error("Email, OTP and verification type are required.");
  }

  //Normalize values
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedVerificationType = verificationType.trim().toUpperCase();

  // Validate verification type
  if (!["EMAIL", "PHONE"].includes(normalizedVerificationType)) {
    throw new Error("Verification type must be EMAIL or PHONE.");
  }

  const pendingRegistration = await validateOtp({
    email: normalizedEmail,
    otp,
    purpose: "REGISTER",
    verificationType: normalizedVerificationType,
  });

  // Double-check email
  const existingEmail = await User.findOne({
    email: normalizedEmail,
  });

  if (existingEmail) {
    await deleteOtp({
      email: normalizedEmail,
      purpose: "REGISTER",
      verificationType: normalizedVerificationType,
    });

    throw new Error("An account with this email already exists.");
  }

  // Double-check phone number
  const existingPhone = await User.findOne({
    phoneNumber: pendingRegistration.phoneNumber,
  });

  if (existingPhone) {
    await deleteOtp({
      id: pendingRegistration._id,
    });

    throw new Error("An account with this phone number already exists.");
  }

  // Create customer
  const customer = await User.create({
    fullName: pendingRegistration.fullName,
    email: pendingRegistration.email,
    phoneNumber: pendingRegistration.phoneNumber,
    password: pendingRegistration.passwordHash,
    role: "CUSTOMER",
    emailVerified: normalizedVerificationType === "EMAIL",
    phoneVerified: normalizedVerificationType === "PHONE",
    isActive: true,
  });

  await createNotification({
    recipient: customer._id,
    title: "Welcome!",
    message:
      "Welcome to our supermarket. Your account has been created successfully.",
    type: "ACCOUNT",
  });

  // Generate access token
  const accessToken = generateAccessToken(customer);

  // Generate refresh token
  const refreshToken = generateRefreshToken(customer);

  // Hash refresh token before storing
  const refreshTokenHash = hashToken(refreshToken);

  // Store hashed refresh token
  await RefreshToken.create({
    user: customer._id,
    tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  //  Delete used OTP
  await deleteOtp({
    id: pendingRegistration._id,
  });

  // Return token + customer
  return {
    accessToken,
    refreshToken,
    customer: {
      id: customer._id,
      fullName: customer.fullName,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      emailVerified: customer.emailVerified,
      phoneVerified: customer.phoneVerified,
      role: customer.role,
    },
  };
};

// CUSTOMER LOGIN
export const loginCustomerService = async ({ email, password }) => {
  // Validate required fields
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }
  //  Normalize email
  const normalizedEmail = email.trim().toLowerCase();

  // Find customer
  const customer = await User.findOne({
    email: normalizedEmail,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Invalid email or password.");
  }

  if (!customer.password) {
    throw new Error(
      "This account uses Google Sign-In. Please continue with Google.",
    );
  }
  // Check account status
  if (!customer.isActive) {
    throw new Error("Your account is inactive. Please contact support.");
  }

  if (!customer.emailVerified && !customer.phoneVerified) {
    throw new Error("Account verification is required before login.");
  }

  const isPasswordValid = await bcrypt.compare(password, customer.password);

  if (!isPasswordValid) {
    throw new Error("Invalid email or password.");
  }

  const accessToken = generateAccessToken(customer);

  const refreshToken = generateRefreshToken(customer);

  const refreshTokenHash = hashToken(refreshToken);

  await RefreshToken.create({
    user: customer._id,
    tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    accessToken,
    refreshToken,

    customer: {
      id: customer._id,
      fullName: customer.fullName,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      emailVerified: customer.emailVerified,
      phoneVerified: customer.phoneVerified,
      role: customer.role,
    },
  };
};

export const refreshCustomerAccessTokenService = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new Error("Refresh token is required.");
  }

  // Verify refresh token JWT
  let decoded;

  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new Error("Invalid or expired refresh token.");
  }

  // Make sure this is a refresh token
  if (decoded.type !== "refresh") {
    throw new Error("Invalid refresh token.");
  }

  // Hash the received refresh token
  const refreshTokenHash = hashToken(refreshToken);

  // Find hashed token in database
  const storedToken = await RefreshToken.findOne({
    tokenHash: refreshTokenHash,
  });

  if (!storedToken) {
    throw new Error("Refresh token has been revoked or does not exist.");
  }

  // Check expiration
  if (storedToken.expiresAt < new Date()) {
    await RefreshToken.deleteOne({
      _id: storedToken._id,
    });

    throw new Error("Refresh token has expired.");
  }

  // Find customer
  const customer = await User.findOne({
    _id: decoded.id,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  // Check account status
  if (!customer.isActive) {
    throw new Error("Your account is inactive. Please contact support.");
  }

  // Generate new access token
  const accessToken = generateAccessToken(customer);

  return {
    accessToken,
  };
};

// GET CUSTOMER PROFILE
export const getCustomerProfileService = async (userId) => {
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  }).select("-password");

  if (!customer) {
    throw new Error("Customer not found.");
  }

  return {
    id: customer._id,
    fullName: customer.fullName,
    email: customer.email,
    phoneNumber: customer.phoneNumber,
    emailVerified: customer.emailVerified,
    phoneVerified: customer.phoneVerified,
    role: customer.role,
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
};

// UPDATE CUSTOMER PROFILE
export const updateCustomerProfileService = async (
  userId,
  { fullName, gender, dateOfBirth },
) => {
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  // Update full name
  if (fullName !== undefined) {
    const name = fullName.trim();

    if (!name) {
      throw new Error("Full name is required.");
    }

    customer.fullName = name;
  }

  // Update gender
  if (gender !== undefined) {
    customer.gender =
      typeof gender === "string" ? gender.trim() || null : gender;
  }

  // Update date of birth
  if (dateOfBirth !== undefined) {
    if (dateOfBirth === null || dateOfBirth === "") {
      customer.dateOfBirth = null;
    } else {
      const parsedDate = new Date(dateOfBirth);

      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error("Invalid date of birth.");
      }

      if (parsedDate > new Date()) {
        throw new Error("Date of birth cannot be in the future.");
      }

      customer.dateOfBirth = parsedDate;
    }
  }

  await customer.save();

  return {
    id: customer._id,
    fullName: customer.fullName,
    email: customer.email,
    phoneNumber: customer.phoneNumber,
    gender: customer.gender,
    dateOfBirth: customer.dateOfBirth,
    emailVerified: customer.emailVerified,
    phoneVerified: customer.phoneVerified,
    role: customer.role,
    isActive: customer.isActive,
  };
};
// REQUEST FORGOT PASSWORD OTP
export const requestForgotPasswordOtpService = async ({ email }) => {
  if (!email) {
    throw new Error("Email is required.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const customer = await User.findOne({
    email: normalizedEmail,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  await ensureNoActiveOtp({
    email: normalizedEmail,
    purpose: "FORGOT_PASSWORD",
    verificationType: "EMAIL",
  });

  const { otp } = await createOtp({
    email: normalizedEmail,
    purpose: "FORGOT_PASSWORD",
    verificationType: "EMAIL",
  });

  await sendOtpEmail({
    recipientEmail: normalizedEmail,
    recipientName: customer.fullName,
    otp,
  });

  return {
    message: "Password reset OTP has been sent to your email.",
  };
};

export const resendForgotPasswordOtpService = async ({ email }) => {
  if (!email || typeof email !== "string") {
    throw new Error("Email is required.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const customer = await User.findOne({
    email: normalizedEmail,
    role: "CUSTOMER",
  });

  if (!customer) {
    // Avoid revealing whether an account exists.
    throw new Error("Unable to process this request.");
  }

  const purpose = "FORGOT_PASSWORD";
  const verificationType = "EMAIL";

  const resendState = await checkOtpResendAllowed({
    email: normalizedEmail,
    purpose,
    verificationType,
  });

  const { otp } = await createOtp({
    email: normalizedEmail,
    purpose,
    verificationType,
  });

  await sendOtpEmail({
    recipientEmail: normalizedEmail,
    recipientName: customer.fullName,
    otp,
  });

  await recordOtpResend(resendState);

  return {
    message: "If the request is eligible, a new OTP has been sent.",
  };
};

//VERIFY OTP
export const verifyForgotPasswordOtpService = async ({ email, otp }) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  await validateOtp({
    email: normalizedEmail,
    otp,
    purpose: "FORGOT_PASSWORD",
    verificationType: "EMAIL",
  });

  await deleteOtp({
    email: normalizedEmail,
    purpose: "FORGOT_PASSWORD",
    verificationType: "EMAIL",
  });

  const resetToken = crypto.randomBytes(32).toString("hex");

  const cacheKey = passwordResetCacheKeys.verificationToken(resetToken);

  await setCache(cacheKey, { email: normalizedEmail }, 10 * 60);

  return {
    message: "OTP verified successfully.",
    resetToken,
  };
};

// RESET FORGOT PASSWORD
export const resetForgotPasswordService = async ({
  resetToken,
  newPassword,
}) => {
  if (!resetToken || !newPassword) {
    throw new Error("Reset token and new password are required.");
  }

  validatePassword(newPassword);

  const cacheKey = passwordResetCacheKeys.verificationToken(resetToken);

  const tokenData = await getCache(cacheKey);

  if (!tokenData || !tokenData.email) {
    throw new Error(
      "Invalid or expired reset token. Please verify your OTP again.",
    );
  }

  const customer = await User.findOne({
    email: tokenData.email,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  customer.password = await bcrypt.hash(newPassword, 10);

  await customer.save();

  await deleteCache(cacheKey);

  await createNotification({
    recipient: customer._id,
    title: "Password Changed",
    message: "Your password has been reset successfully.",
    type: "ACCOUNT",
  });

  return {
    message: "Password reset successfully. Please login.",
  };
};

//change password
export const changePasswordService = async (
  userId,
  { currentPassword, newPassword },
) => {
  // Validate required fields
  if (!currentPassword || !newPassword) {
    throw new Error("Current password, new password are required.");
  }

  validatePassword(newPassword);

  // Find customer
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  if (!customer.password) {
    throw new Error(
      "This account uses Google Sign-In. Password changes are not available.",
    );
  }

  // Verify current password
  const isPasswordCorrect = await bcrypt.compare(
    currentPassword,
    customer.password,
  );

  if (!isPasswordCorrect) {
    throw new Error("Current password is incorrect.");
  }

  // Prevent reusing the same password
  const isSamePassword = await bcrypt.compare(newPassword, customer.password);

  if (isSamePassword) {
    throw new Error(
      "New password must be different from the current password.",
    );
  }

  // Save new password
  customer.password = await bcrypt.hash(newPassword, 10);

  await customer.save();

  await createNotification({
    recipient: customer._id,
    title: "Password Updated",
    message: "Your account password has been changed successfully.",
    type: "ACCOUNT",
  });

  return {
    message: "Password changed successfully.",
  };
};

//delete account
export const deleteAccountService = async (userId, { password, reason }) => {
  // Validate password
  if (!password) {
    throw new Error("Password is required.");
  }

  // Find customer
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  // Make sure this is a password-based account
  if (!customer.password) {
    throw new Error(
      "This account does not have a password. Please use the appropriate account deletion method.",
    );
  }

  // Verify password
  const isPasswordCorrect = await bcrypt.compare(password, customer.password);

  if (!isPasswordCorrect) {
    throw new Error("Incorrect password.");
  }

  // Optional reason
  const normalizedReason = typeof reason === "string" ? reason.trim() : "";

  await AccountDeletion.create({
    user: customer._id,
    reason: normalizedReason,
  });

  // Delete customer
  await User.findByIdAndDelete(customer._id);

  // Revoke all refresh tokens
  await RefreshToken.deleteMany({
    user: customer._id,
  });

  return {
    message: "Account deleted successfully.",
  };
};

// REQUEST CHANGE PHONE OTP
export const requestChangePhoneOtpService = async (userId) => {
  // Find customer
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  await ensureNoActiveOtp({
    email: customer.email,
    purpose: "CHANGE_PHONE",
    verificationType: "EMAIL",
  });

  const { otp } = await createOtp({
    email: customer.email,
    purpose: "CHANGE_PHONE",
    verificationType: "EMAIL",
  });

  await sendOtpEmail({
    recipientEmail: customer.email,
    recipientName: customer.fullName,
    otp,
  });

  return {
    message: "OTP has been sent to your registered email.",
  };
};

export const resendChangePhoneOtpService = async (userId) => {
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const purpose = "CHANGE_PHONE";
  const verificationType = "EMAIL";

  const resendState = await checkOtpResendAllowed({
    email: customer.email,
    purpose,
    verificationType,
  });

  const { otp } = await createOtp({
    email: customer.email,
    purpose,
    verificationType,
  });

  await sendOtpEmail({
    recipientEmail: customer.email,
    recipientName: customer.fullName,
    otp,
  });

  await recordOtpResend(resendState);

  return {
    message: "A new OTP has been sent to your registered email.",
  };
};

// VERIFY CHANGE PHONE OTP
export const verifyChangePhoneOtpService = async (userId, { otp }) => {
  if (!otp) {
    throw new Error("OTP is required.");
  }

  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  await validateOtp({
    email: customer.email,
    otp,
    purpose: "CHANGE_PHONE",
    verificationType: "EMAIL",
  });

  await deleteOtp({
    email: customer.email,
    purpose: "CHANGE_PHONE",
    verificationType: "EMAIL",
  });

  const verificationToken = crypto.randomBytes(32).toString("hex");

  const cacheKey = phoneChangeCacheKeys.verificationToken(verificationToken);

  await setCache(
    cacheKey,
    {
      userId: customer._id.toString(),
    },
    10 * 60,
  );

  return {
    message: "OTP verified successfully.",
    verificationToken,
  };
};

// CHANGE PHONE NUMBER
export const changePhoneNumberService = async (
  userId,
  { verificationToken, phoneNumber },
) => {
  if (!verificationToken || !phoneNumber) {
    throw new Error("Verification token and phone number are required.");
  }

  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

  const cacheKey = phoneChangeCacheKeys.verificationToken(verificationToken);

  const tokenData = await getCache(cacheKey);

  if (!tokenData) {
    throw new Error(
      "Invalid or expired verification token. Please verify your OTP again.",
    );
  }

  if (tokenData.userId !== userId.toString()) {
    throw new Error("Invalid verification token.");
  }

  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  if (customer.phoneNumber === normalizedPhoneNumber) {
    throw new Error("This is already your current phone number.");
  }

  const existingUser = await User.findOne({
    phoneNumber: normalizedPhoneNumber,
    _id: { $ne: customer._id },
  });

  if (existingUser) {
    throw new Error("Phone number is already in use.");
  }

  customer.phoneNumber = normalizedPhoneNumber;
  customer.phoneVerified = true;

  await customer.save();

  await deleteCache(cacheKey);

  await createNotification({
    recipient: customer._id,
    title: "Phone Number Updated",
    message: "Your phone number has been updated successfully.",
    type: "ACCOUNT",
  });

  return {
    message: "Phone number updated successfully.",
    customer: {
      id: customer._id,
      fullName: customer.fullName,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      emailVerified: customer.emailVerified,
      phoneVerified: customer.phoneVerified,
      role: customer.role,
    },
  };
};

// GOOGLE LOGIN
export const googleLoginService = async ({ idToken }) => {
  if (!idToken) {
    throw new Error("Google ID token is required.");
  }

  // Verify Google ID Token
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error("Unable to verify Google account.");
  }

  const { sub, email, name, picture, email_verified } = payload;

  if (!email) {
    throw new Error("Google account does not provide an email address.");
  }

  if (!email_verified) {
    throw new Error("Google email address is not verified.");
  }

  // Find existing customer
  let customer = await User.findOne({
    email: email.toLowerCase(),
    role: "CUSTOMER",
  });

  if (customer) {
    if (!customer.isActive) {
      throw new Error("Your account is inactive. Please contact support.");
    }

    // Link Google account if not already linked
    if (!customer.googleId) {
      customer.googleId = sub;
    }

    customer.authProvider = "GOOGLE";
    customer.emailVerified = true;

    // Update profile image if Google provides one
    if (picture) {
      customer.profileImage = picture;
    }

    await customer.save();
  } else {
    // Create new customer
    customer = await User.create({
      fullName: name,
      email: email.toLowerCase(),
      phoneNumber: null,
      password: null,
      googleId: sub,
      profileImage: picture || null,
      authProvider: "GOOGLE",
      emailVerified: true,
      phoneVerified: false,
      role: "CUSTOMER",
      isActive: true,
    });

    await createNotification({
      recipient: customer._id,
      title: "Welcome!",
      message:
        "Welcome to our supermarket. Your Google account has been registered successfully.",
      type: "ACCOUNT",
    });
  }

  // Generate access token
  const accessToken = generateAccessToken(customer);

  // Generate refresh token
  const refreshToken = generateRefreshToken(customer);

  // Hash refresh token before storing
  const refreshTokenHash = hashToken(refreshToken);

  // Store hashed refresh token
  await RefreshToken.create({
    user: customer._id,
    tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    accessToken,
    refreshToken,
    customer: {
      id: customer._id,
      fullName: customer.fullName,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      emailVerified: customer.emailVerified,
      phoneVerified: customer.phoneVerified,
      role: customer.role,
      profileImage: customer.profileImage,
    },
  };
};
