import {
  getUsersService,
  getUserByIdService,
  updateUserStatusService,
} from "../services/user.service.js";

// Get all users
export const getUsers = async (req, res) => {
  try {
    const {
      page,
      limit,
      search,
      role,
      isActive,
    } = req.query;

    const result = await getUsersService({
      page,
      limit,
      search,
      role,
      isActive,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await getUserByIdService(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Activate / deactivate user
export const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: "isActive is required.",
      });
    }

    const user = await updateUserStatusService(
      req.params.id,
      isActive
    );

    return res.status(200).json({
      success: true,
      message: isActive
        ? "User activated successfully."
        : "User deactivated successfully.",
      user,
    });
  } catch (error) {
    console.error(
      "Update user status error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};