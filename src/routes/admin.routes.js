import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.get(
  "/dashboard",
  authenticate,
  authorizeRoles("ADMIN"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome to admin dashboard.",
      user: req.user,
    });
  }
);

export default router;