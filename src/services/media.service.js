import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

import dotenv from "dotenv";

dotenv.config();

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: "auto",

  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,

  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const uploadToR2 = async (file, folder) => {
  try {
    const safeFileName = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const key = `${folder}/${Date.now()}-${safeFileName}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      key,
    };
  } catch (error) {
    console.error("R2 upload error:", error);

    throw new Error("Failed to upload file to storage.");
  }
};

export const deleteFromR2 = async (key) => {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
      }),
    );

    return true;
  } catch (error) {
    console.error("R2 delete error:", error);

    throw new Error("Failed to delete file from storage.");
  }
};
