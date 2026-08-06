import express from "express";

import { getDashboard } from "../controllers/dashboard.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// Protect dashboard route
router.use(authenticate);
router.use(authorizeRoles("ADMIN"));

// Get admin dashboard
router.get("/", getDashboard);

export default router;
