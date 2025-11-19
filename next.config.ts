import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Para build Docker
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true, // Para funcionar com imagens externas
  },
};

export default nextConfig;
