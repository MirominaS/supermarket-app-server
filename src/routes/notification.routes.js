import express from "express";

import {
  getNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Protect all routes
router.use(authenticate);

// Get all notifications
router.get("/", getNotifications);

// Get notification by ID
router.get("/:id", getNotificationById);

// Mark one notification as read
router.patch("/:id/read", markNotificationAsRead);

// Mark all notifications as read
router.patch("/read-all", markAllNotificationsAsRead);

// Delete notification
router.delete("/:id", deleteNotification);

export default router;