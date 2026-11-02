import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["@prisma/adapter-pg", "pg", "nodemailer"],
  // next-intl's config plugin loads a native SWC binding that this machine
  // blocks. The alias below is the same link that plugin would add for
  // src/i18n/request.ts.
  turbopack: {
    resolveAlias: {
      "next-intl/config": "./src/i18n/request.ts",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias["next-intl/config"] = path.resolve(
      config.context ?? process.cwd(),
      "src/i18n/request.ts",
    );
    return config;
  },
};

export default nextConfig;
