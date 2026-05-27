const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: { maxEntries: 200 },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["node:sqlite"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // node:sqlite est un module intégré Node.js 22+ — ne pas bundler avec webpack
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "node:sqlite",
      ];
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
