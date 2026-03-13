import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Provide an explicit Turbopack config to avoid build error on Vercel
  turbopack: {},
  // turbopack removed - using webpack for development
  // Webpack configuration to handle Node.js modules that shouldn't be bundled for the client
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // For client-side builds, we need to handle Node.js modules
      // that are imported by mongodb but shouldn't be bundled for the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      };

      // Exclude client-side encryption code from mongodb package
      config.externals = [
        ...(config.externals || []),
        // Handle mongodb client-side encryption
        { mongodb: "mongodb" },
      ];
    }
    return config;
  },
};

export default nextConfig;
