import Media from "../models/media.model.js";
import { uploadToR2, deleteFromR2, s3 } from "../services/media.service.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required.",
      });
    }

    const { folder } = req.body;

    const allowedFolders = [
      "product-images",
      "customer-profile-images",
      "offer-images",
    ];

    if (!allowedFolders.includes(folder)) {
      return res.status(400).json({
        success: false,
        message: "Invalid media folder.",
      });
    }

    // Product images
    if (folder === "product-images" && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only admins can upload product images.",
      });
    }

    // Customer profile image
    if (folder === "customer-profile-images" && req.user.role !== "CUSTOMER") {
      return res.status(403).json({
        success: false,
        message: "Only customers can upload profile images.",
      });
    }

    // Offer images
    if (folder === "offer-images" && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only admins can upload offer images.",
      });
    }

    const result = await uploadToR2(req.file, folder);

    const visibility =
      folder === "product-images" || folder === "offer-images"
        ? "public"
        : "private";

    const media = await Media.create({
      key: result.key,
      uploadedBy: req.user._id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      type: "image",
      folder,
      visibility,
    });

    return res.status(201).json({
      success: true,
      message: "Image uploaded successfully.",
      media: {
        id: media._id,
        key: media.key,
        originalName: media.originalName,
        mimeType: media.mimeType,
        size: media.size,
        folder: media.folder,
        visibility: media.visibility,

        // Only product images have public URL
        url: visibility === "public" ? result.url : null,
      },
    });
  } catch (error) {
    console.error("Upload media error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMediaAccessUrl = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found.",
      });
    }

    // Only product and offer images are allowed through this endpoint
    if (media.folder !== "product-images" && media.folder !== "offer-images") {
      return res.status(400).json({
        success: false,
        message: "This endpoint is only for product and offer images.",
      });
    }

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: media.key,
      }),
      {
        // Product image URL valid for 1 hour
        expiresIn: 3600,
      },
    );

    return res.status(200).json({
      success: true,
      url,
    });
  } catch (error) {
    console.error("Get product media URL error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate media URL.",
    });
  }
};

export const getProfileMediaAccessUrl = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found.",
      });
    }

    // Make sure this is a customer profile image
    if (media.folder !== "customer-profile-images") {
      return res.status(400).json({
        success: false,
        message: "This endpoint is only for customer profile images.",
      });
    }

    // Check owner
    const isOwner = media.uploadedBy.toString() === req.user._id.toString();

    // Check admin
    const isAdmin = req.user.role === "ADMIN";

    // Only owner or admin can access
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: media.key,
      }),
      {
        // Profile image URL valid for 5 minutes
        expiresIn: 300,
      },
    );

    return res.status(200).json({
      success: true,
      url,
    });
  } catch (error) {
    console.error("Get profile media URL error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate profile image URL.",
    });
  }
};

export const deleteMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found.",
      });
    }

    const isOwner = media.uploadedBy.toString() === req.user._id.toString();

    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    await deleteFromR2(media.key);

    await media.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Media deleted successfully.",
    });
  } catch (error) {
    console.error("Delete media error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "New image is required.",
      });
    }

    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found.",
      });
    }

    const isOwner = media.uploadedBy.toString() === req.user._id.toString();

    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    // Delete old R2 object
    await deleteFromR2(media.key);

    // Upload new image
    const result = await uploadToR2(req.file, media.folder);

    media.key = result.key;

    media.originalName = req.file.originalname;

    media.mimeType = req.file.mimetype;

    media.size = req.file.size;

    await media.save();

    return res.status(200).json({
      success: true,
      message: "Image updated successfully.",

      media: {
        id: media._id,
        key: media.key,
        originalName: media.originalName,
        mimeType: media.mimeType,
        size: media.size,
        folder: media.folder,
        visibility: media.visibility,

        url: media.visibility === "public" ? result.url : null,
      },
    });
  } catch (error) {
    console.error("Update media error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
