import type { NextConfig } from "next";
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from the root directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const nextConfig: NextConfig = {
  /* config options here */

  // Environment variables are loaded from the root directory (.env file)
  // Next.js will automatically use the environment variables set by dotenv.config()
};

export default nextConfig;
