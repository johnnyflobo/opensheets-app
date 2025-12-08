import type { NextConfig } from "next";
import dotenv from "dotenv";
import withPWAInit from "@ducanh2912/next-pwa";

// Carregar variáveis de ambiente explicitamente
dotenv.config();

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // Output standalone para Docker (gera build otimizado com apenas deps necessárias)
  output: "standalone",
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
        {
            protocol: "https",
            hostname: "lh3.googleusercontent.com",
            pathname: "**",
        }
    ],
  },
  devIndicators: {
    position: "bottom-right",
  },
};

export default withPWA(nextConfig);
