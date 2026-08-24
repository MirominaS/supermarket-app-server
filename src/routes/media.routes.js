import express from "express";

import upload from "../middleware/upload.js";

import {
  uploadMedia,
  getMediaAccessUrl,
  getProfileMediaAccessUrl,
  deleteMedia,
  updateMedia,
} from "../controllers/media.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Upload image
router.post("/upload", authenticate, upload.single("file"), uploadMedia);

// Get image URL
router.get("/:id/url", getMediaAccessUrl);

router.get("/profile/:id/url", authenticate, getProfileMediaAccessUrl);

// Update image
router.patch("/:id", authenticate, upload.single("file"), updateMedia);

// Delete image
router.delete("/:id", authenticate, deleteMedia);

export default router;
