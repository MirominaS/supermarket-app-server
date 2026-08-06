import express from "express";

import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.use(authenticate, authorizeRoles("ADMIN"));

router.post("/", createCategory);

router.get("/", getCategories);

router.get("/:id", getCategoryById);

router.put("/:id", updateCategory);

router.delete("/:id", deleteCategory);

export default router;
