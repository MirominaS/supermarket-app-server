import express from "express";
import {
  adminLogin,
  adminRefreshToken,
  adminLogout,
  staffLogin,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/login", adminLogin);
router.post("/refresh", adminRefreshToken);
router.post("/logout", adminLogout);
router.post("/staff/login", staffLogin);
export default router;
 