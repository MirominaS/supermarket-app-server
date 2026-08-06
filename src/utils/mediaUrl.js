import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../services/mediaService.js";

export const generateSignedUrl = async (key, expiresIn = 3600) => {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    }),
    { expiresIn },
  );
};

export const attachSignedUrls = async (mediaArray) => {
  if (!mediaArray?.length) return [];

  return Promise.all(
    mediaArray.map(async (media) => ({
      _id: media._id,
      originalName: media.originalName,
      mimeType: media.mimeType,
      folder: media.folder,
      url: await generateSignedUrl(media.key),
    })),
  );
};
