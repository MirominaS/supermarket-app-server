import mongoose from "mongoose";
import User from "../models/user.model.js";

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
    const allowedRoles = ["ADMIN", "CUSTOMER"];

    if (!allowedRoles.includes(role)) {
      throw new Error("Invalid role.");
    }

    filter.role = role;
  }

  // Active status filter
  if (isActive !== undefined) {
    if (isActive !== "true" && isActive !== "false") {
      throw new Error(
        "isActive must be true or false."
      );
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

  const user = await User.findById(userId)
    .select("-password");

  if (!user) {
    throw new Error("User not found.");
  }

  return user;
};

export const updateUserStatusService = async (
  userId,
  isActive
) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  if (typeof isActive !== "boolean") {
    throw new Error(
      "isActive must be a boolean."
    );
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  user.isActive = isActive;

  await user.save();

  return await User.findById(user._id)
    .select("-password");
};