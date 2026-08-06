import {
  getNotificationsService,
  getNotificationByIdService,
  markNotificationAsReadService,
  markAllNotificationsAsReadService,
  deleteNotificationService,
} from "../services/notification.service.js";

// GET ALL NOTIFICATIONS
export const getNotifications = async (req, res) => {
  try {
    const { page, limit, isRead } = req.query;

    const result = await getNotificationsService({
      userId: req.user._id,
      page,
      limit,
      isRead,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET NOTIFICATION BY ID
export const getNotificationById = async (req, res) => {
  try {
    const notification = await getNotificationByIdService(
      req.user._id,
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// MARK NOTIFICATION AS READ
export const markNotificationAsRead = async (req, res) => {
  try {
    const result = await markNotificationAsReadService(
      req.user._id,
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// MARK ALL NOTIFICATIONS AS READ
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await markAllNotificationsAsReadService(
      req.user._id,
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE NOTIFICATION
export const deleteNotification = async (req, res) => {
  try {
    const result = await deleteNotificationService(
      req.user._id,
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};