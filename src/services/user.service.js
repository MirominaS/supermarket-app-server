import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

const STAFF_ROLES = ["MANAGER", "CASHIER"];

export const createUserService = async (data) => {
  const { username, managerName, password, role } = data;

  if (!username?.trim()) {
    throw new Error("Username is required.");
  }

  if (!managerName?.trim()) {
    throw new Error("Manager name is required.");
  }

  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (!STAFF_ROLES.includes(role)) {
    throw new Error("Staff role must be MANAGER or CASHIER.");
  }

  const normalizedUsername = username.trim().toLowerCase();

  const existingUser = await User.findOne({
    username: normalizedUsername,
  });

  if (existingUser) {
    const error = new Error("Username already exists.");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    username: normalizedUsername,
    managerName: managerName.trim(),
    password: hashedPassword,
    role,
    isActive: true,
  });

  const result = user.toObject();
  delete result.password;

  return result;
};

export const getUsersService = async ({
  page = 1,
  limit = 10,
  search,
  role,
  isActive,
}) => {
  page = Number(page);
  limit = Number(limit);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Page must be a positive integer.");
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Limit must be a positive integer.");
  }

  const filter = {};

  // Search by name, email or phone number
  if (search) {
    filter.$or = [
      {
        fullName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        email: {
          $regex: search,
          $options: "i",
        },
      },
      {
        phoneNumber: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  // Role filter
  if (role) {
    const allowedRoles = ["ADMIN", "MANAGER", "CASHIER", "CUSTOMER"];

    if (!allowedRoles.includes(role)) {
      throw new Error("Invalid role.");
    }

    filter.role = role;
  }

  // Active status filter
  if (isActive !== undefined) {
    if (isActive !== "true" && isActive !== "false") {
      throw new Error("isActive must be true or false.");
    }

    filter.isActive = isActive === "true";
  }

  const total = await User.countDocuments(filter);

  const users = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

export const getUserByIdService = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  const user = await User.findById(userId).select("-password");

  if (!user) {
    throw new Error("User not found.");
  }

  return user;
};

export const updateUserStatusService = async (userId, isActive) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  if (typeof isActive !== "boolean") {
    throw new Error("isActive must be a boolean.");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  user.isActive = isActive;

  await user.save();

  return await User.findById(user._id).select("-password");
};

export const updateUserService = async (userId, data) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  // This endpoint is for staff accounts only.
  if (!STAFF_ROLES.includes(user.role)) {
    const error = new Error("Only staff accounts can be edited here.");
    error.statusCode = 403;
    throw error;
  }

  const { username, managerName, password, role } = data;

  if (username !== undefined) {
    if (typeof username !== "string" || !username.trim()) {
      throw new Error("Username cannot be empty.");
    }

    const normalizedUsername = username.trim().toLowerCase();

    const duplicate = await User.findOne({
      username: normalizedUsername,
      _id: { $ne: user._id },
    });

    if (duplicate) {
      const error = new Error("Username already exists.");
      error.statusCode = 409;
      throw error;
    }

    user.username = normalizedUsername;
  }

  if (managerName !== undefined) {
    if (typeof managerName !== "string" || !managerName.trim()) {
      throw new Error("Manager name cannot be empty.");
    }

    user.managerName = managerName.trim();
  }

  if (role !== undefined) {
    if (!STAFF_ROLES.includes(role)) {
      throw new Error("Staff role must be MANAGER or CASHIER.");
    }

    user.role = role;
  }

  // An empty password means "keep the existing password".
  if (password !== undefined && password !== "") {
    if (typeof password !== "string" || password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    user.password = await bcrypt.hash(password, 12);
  }

  await user.save();

  const result = user.toObject();
  delete result.password;

  return result;
};

export const deleteUserService = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  // Prevent this staff-management endpoint from deleting non-staff accounts.
  if (!STAFF_ROLES.includes(user.role)) {
    const error = new Error("Only staff accounts can be deleted here.");
    error.statusCode = 403;
    throw error;
  }

  await User.deleteOne({ _id: user._id });

  return { id: user._id };
};
