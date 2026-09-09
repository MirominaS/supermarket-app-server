import express from "express";
import {
  adminLogin,
  adminRefreshToken,
  adminLogout,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/login", adminLogin);
router.post("/refresh", adminRefreshToken);
router.post("/logout", adminLogout);

export default router;
 