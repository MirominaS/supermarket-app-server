import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

export const createNotification = async ({
  recipient,
  title,
  message,
  type,
  data = {},
}) => {
  if (!recipient) {
    throw new Error("Recipient is required.");
  }

  if (!title) {
    throw new Error("Title is required.");
  }

  if (!message) {
    throw new Error("Message is required.");
  }

  if (!type) {
    throw new Error("Notification type is required.");
  }

  const notification = await Notification.create({
    recipient,
    title: title.trim(),
    message: message.trim(),
    type,
    data,
  });

  return notification;
};

export const getNotificationsService = async ({
  userId,
  page = 1,
  limit = 10,
  isRead,
}) => {
  // Validate user ID
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  // Find user
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  const filter = {
    recipient: userId,
  };

  // Optional read/unread filter
  if (isRead !== undefined) {
    if (isRead === "true" || isRead === true) {
      filter.isRead = true;
    } else if (isRead === "false" || isRead === false) {
      filter.isRead = false;
    } else {
      throw new Error("isRead must be true or false.");
    }
  }

  page = Number(page);
  limit = Number(limit);

  const total = await Notification.countDocuments(filter);

  const notifications = await Notification.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip((page - 1) * limit)
    .limit(limit);

  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });

  return {
    notifications,
    unreadCount,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

export const getNotificationByIdService = async (
  userId,
  notificationId,
) => {
  // Validate notification ID
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new Error("Invalid notification ID.");
  }

  // Find user
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  // Find notification
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw new Error("Notification not found.");
  }

  return notification;
};

export const markNotificationAsReadService = async (
  userId,
  notificationId,
) => {
  // Validate notification ID
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new Error("Invalid notification ID.");
  }

  // Find user
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  // Find notification
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw new Error("Notification not found.");
  }

  // Already read
  if (notification.isRead) {
    return {
      message: "Notification is already marked as read.",
      notification,
    };
  }

  // Mark as read
  notification.isRead = true;

  await notification.save();

  return {
    message: "Notification marked as read successfully.",
    notification,
  };
};

export const markAllNotificationsAsReadService = async (
  userId,
) => {
  // Validate user ID
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  // Find user
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  // Mark all unread notifications as read
  const result = await Notification.updateMany(
    {
      recipient: userId,
      isRead: false,
    },
    {
      isRead: true,
    },
  );

  return {
    message: "All notifications marked as read successfully.",
    modifiedCount: result.modifiedCount,
  };
};

export const deleteNotificationService = async (
  userId,
  notificationId,
) => {
  // Validate notification ID
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new Error("Invalid notification ID.");
  }

  // Find user
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  // Find notification
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw new Error("Notification not found.");
  }

  // Delete notification
  await Notification.deleteOne({
    _id: notification._id,
  });

  return {
    message: "Notification deleted successfully.",
  };
};