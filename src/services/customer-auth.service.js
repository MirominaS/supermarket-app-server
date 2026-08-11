import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import { sendOtpEmail } from "../utils/mail.helper.js";
import { generateToken } from "../utils/jwt.js";
import {
  createOtp,
  validateOtp,
  deleteOtp,
} from "./otp/customer-otp.service.js";
import { normalizePhoneNumber } from "../utils/phone.helper.js";
import { OAuth2Client } from "google-auth-library";
import { createNotification } from "./notification.service.js";
import { validatePassword } from "../utils/password.helper.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// REQUEST CUSTOMER REGISTRATION OTP
export const requestCustomerRegistrationOtp = async ({
  fullName,
  email,
  phoneNumber,
  password,
  confirmPassword,
  verificationType,
}) => {
  // Validate required fields
  if (
    !fullName ||
    !email ||
    !phoneNumber ||
    !password ||
    !confirmPassword ||
    !verificationType
  ) {
    throw new Error(
      "Full name, email, phone number, password, confirm password and verification type are required.",
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
  // Validate password
  if (password !== confirmPassword) {
    throw new Error("Password and confirm password do not match.");
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
      id: pendingRegistration._id,
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

  const token = generateToken(customer);

  //  Delete used OTP
  await deleteOtp({
    id: pendingRegistration._id,
  });

  // Return token + customer
  return {
    token,
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

  const token = generateToken(customer);

  return {
    token,

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
export const updateCustomerProfileService = async (userId, { fullName }) => {
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  if (fullName !== undefined) {
    const name = fullName.trim();

    if (!name) {
      throw new Error("Full name is required.");
    }

    customer.fullName = name;
  }

  await customer.save();

  return {
    id: customer._id,
    fullName: customer.fullName,
    email: customer.email,
    phoneNumber: customer.phoneNumber,
    emailVerified: customer.emailVerified,
    phoneVerified: customer.phoneVerified,
    role: customer.role,
    isActive: customer.isActive,
  };
};

// REQUEST FORGOT PASSWORD OTP
export const requestForgotPasswordOtpService = async ({ email }) => {
  // Validate
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

// RESET FORGOT PASSWORD
export const resetForgotPasswordService = async ({
  email,
  otp,
  newPassword,
  confirmPassword,
}) => {
  // Validate required fields
  if (!email || !otp || !newPassword || !confirmPassword) {
    throw new Error(
      "Email, OTP, new password and confirm password are required.",
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Validate password
  if (newPassword !== confirmPassword) {
    throw new Error("New password and confirm password do not match.");
  }

  validatePassword(newPassword);

  // Validate OTP
  const forgotPasswordOtp = await validateOtp({
    email: normalizedEmail,
    otp,
    purpose: "FORGOT_PASSWORD",
    verificationType: "EMAIL",
  });

  // Find customer
  const customer = await User.findOne({
    email: normalizedEmail,
    role: "CUSTOMER",
  });

  if (!customer) {
    await deleteOtp({
      id: forgotPasswordOtp._id,
    });

    throw new Error("Customer not found.");
  }

  // Update password
  customer.password = await bcrypt.hash(newPassword, 10);

  await customer.save();

  await createNotification({
    recipient: customer._id,
    title: "Password Changed",
    message: "Your password has been reset successfully.",
    type: "ACCOUNT",
  });

  // Delete OTP
  await deleteOtp({
    id: forgotPasswordOtp._id,
  });

  return {
    message: "Password reset successfully. Please login.",
  };
};

//change password
export const changePasswordService = async (
  userId,
  { currentPassword, newPassword, confirmPassword },
) => {
  // Validate required fields
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new Error(
      "Current password, new password and confirm password are required.",
    );
  }

  // Validate new passwords
  if (newPassword !== confirmPassword) {
    throw new Error("New password and confirm password do not match.");
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
//request  OTP for delete account
export const requestDeleteAccountOtpService = async (userId, { password }) => {
  if (!password) {
    throw new Error("Password is required.");
  }

  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const isPasswordCorrect = await bcrypt.compare(password, customer.password);

  if (!isPasswordCorrect) {
    throw new Error("Incorrect password.");
  }

  const { otp } = await createOtp({
    email: customer.email,
    purpose: "DELETE_ACCOUNT",
    verificationType: "EMAIL",
  });

  await sendOtpEmail({
    recipientEmail: customer.email,
    recipientName: customer.fullName,
    otp,
  });

  return {
    message: "OTP has been sent to your email.",
  };
};

export const deleteAccountService = async (userId, { otp }) => {
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

  const otpRecord = await validateOtp({
    email: customer.email,
    otp,
    purpose: "DELETE_ACCOUNT",
    verificationType: "EMAIL",
  });

  await User.findByIdAndDelete(customer._id);

  await deleteOtp({
    id: otpRecord._id,
  });

  return {
    message: "Account deleted successfully.",
  };
};

// REQUEST CHANGE EMAIL OTP
export const requestChangeEmailOtpService = async (userId, { newEmail }) => {
  if (!newEmail) {
    throw new Error("New email is required.");
  }

  const normalizedEmail = newEmail.trim().toLowerCase();

  // Find customer
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  // Already using this email
  if (customer.email === normalizedEmail) {
    throw new Error("This is already your current email.");
  }

  // Email already belongs to another account
  const existingUser = await User.findOne({
    email: normalizedEmail,
    _id: { $ne: customer._id },
  });

  if (existingUser) {
    throw new Error("Email is already in use.");
  }

  // Create OTP
  const { otp } = await createOtp({
    email: customer.email, // current email
    purpose: "CHANGE_EMAIL",
    verificationType: "EMAIL",
    data: {
      newEmail: normalizedEmail,
    },
  });

  // Send OTP to CURRENT email
  await sendOtpEmail({
    recipientEmail: customer.email,
    recipientName: customer.fullName,
    otp,
  });

  return {
    message: "OTP has been sent to your current email.",
  };
};

// VERIFY CHANGE EMAIL OTP
export const verifyChangeEmailOtpService = async (userId, { otp }) => {
  // Validate input
  if (!otp) {
    throw new Error("OTP is required.");
  }

  // Find customer
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  // Validate OTP
  const otpRecord = await validateOtp({
    email: customer.email,
    otp,
    purpose: "CHANGE_EMAIL",
    verificationType: "EMAIL",
  });

  // Ensure the OTP contains a new email
  if (!otpRecord.newEmail) {
    throw new Error("New email address not found.");
  }

  // Double-check that the email hasn't been taken while OTP was pending
  const existingUser = await User.findOne({
    email: otpRecord.newEmail,
    _id: { $ne: customer._id },
  });

  if (existingUser) {
    await deleteOtp({
      id: otpRecord._id,
    });

    throw new Error("Email address is already in use.");
  }

  // Update email
  customer.email = otpRecord.newEmail;
  customer.emailVerified = true;

  await customer.save();

  await createNotification({
    recipient: customer._id,
    title: "Email Updated",
    message: "Your email address has been updated successfully.",
    type: "ACCOUNT",
  });

  // Remove OTP
  await deleteOtp({
    id: otpRecord._id,
  });

  return {
    message: "Email address updated successfully.",
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

// REQUEST CHANGE PHONE OTP
export const requestChangePhoneOtpService = async (userId, { phoneNumber }) => {
  if (!phoneNumber) {
    throw new Error("Phone number is required.");
  }

  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

  // Find customer
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  // Same phone
  if (customer.phoneNumber === normalizedPhoneNumber) {
    throw new Error("This is already your current phone number.");
  }

  // Already used
  const existingUser = await User.findOne({
    phoneNumber: normalizedPhoneNumber,
    _id: { $ne: customer._id },
  });

  if (existingUser) {
    throw new Error("Phone number is already in use.");
  }

  // Create OTP
  const { otp } = await createOtp({
    email: customer.email,
    purpose: "CHANGE_PHONE",
    verificationType: "EMAIL",
    data: {
      newPhoneNumber: normalizedPhoneNumber,
    },
  });

  // Send OTP
  await sendOtpEmail({
    recipientEmail: customer.email,
    recipientName: customer.fullName,
    otp,
  });

  return {
    message: "OTP has been sent to your email to verify your new phone number.",
  };
};

// VERIFY CHANGE PHONE OTP
export const verifyChangePhoneOtpService = async (userId, { otp }) => {
  if (!otp) {
    throw new Error("OTP is required.");
  }

  // Find customer
  const customer = await User.findOne({
    _id: userId,
    role: "CUSTOMER",
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  // Validate OTP
  const otpRecord = await validateOtp({
    email: customer.email,
    otp,
    purpose: "CHANGE_PHONE",
    verificationType: "EMAIL",
  });

  if (!otpRecord.newPhoneNumber) {
    throw new Error("New phone number not found.");
  }

  // Check if another user already owns the phone number
  const existingUser = await User.findOne({
    phoneNumber: otpRecord.newPhoneNumber,
    _id: { $ne: customer._id },
  });

  if (existingUser) {
    await deleteOtp({
      id: otpRecord._id,
    });

    throw new Error("Phone number is already in use.");
  }

  // Update phone number
  customer.phoneNumber = otpRecord.newPhoneNumber;
  customer.phoneVerified = true;

  await customer.save();

  await createNotification({
    recipient: customer._id,
    title: "Phone Number Updated",
    message: "Your phone number has been updated successfully.",
    type: "ACCOUNT",
  });

  // Delete OTP
  await deleteOtp({
    id: otpRecord._id,
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

  // Generate JWT
  const token = generateToken(customer);

  return {
    token,
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
