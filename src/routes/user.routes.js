import express from "express";

import {
  getUsers,
  getUserById,
  updateUserStatus,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// Protect all user routes
router.use(authenticate);
router.use(authorizeRoles("ADMIN"));

// Get all users
router.get("/", getUsers);
router.post("/", createUser);

// Get user by ID
router.get("/:id", getUserById);

router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

// Activate / deactivate user
router.patch("/:id/status", updateUserStatus);

export default router;
