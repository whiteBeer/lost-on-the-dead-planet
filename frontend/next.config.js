const path = require("path");
const { loadEnvConfig } = require("@next/env");

// Один общий .env в корне репозитория (frontend + backend)
loadEnvConfig(path.join(__dirname, ".."));

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const dockerBuild = process.env.DOCKER_BUILD === "1";

const nextConfig = {
    basePath,
    output: "standalone",
    reactStrictMode: false,
    devIndicators: false,
    // Не тянуть pixi в server/page-data worker на слабом VPS
    serverExternalPackages: ["pixi.js"],
    // Small VPS OOM-killer hits during `next build` typecheck.
    // eslint-ключ в next.config убран: Next 16 его больше не принимает.
    typescript: {
        ignoreBuildErrors: dockerBuild
    }
};

module.exports = nextConfig;
