/**
 * Cloudinary signed-upload helpers — API secret stays on the server.
 */
import { v2 as cloudinary } from 'cloudinary';
import type { Env } from '../config/env.js';

export interface CloudinaryUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

/** Params signed for direct browser upload to Cloudinary. */
export function createUploadSignature(env: Env): CloudinaryUploadSignature {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });

  const timestamp = Math.round(Date.now() / 1000);
  const folder = env.CLOUDINARY_UPLOAD_FOLDER;
  // Only sign params we send on upload — extra signed fields cause "Invalid Signature".
  const paramsToSign = {
    timestamp,
    folder,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder,
  };
}
