const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const dockerBuild = process.env.DOCKER_BUILD === "1";

const nextConfig = {
    basePath,
    output: "standalone",
    reactStrictMode: false,
    devIndicators: false,
    // Small VPS OOM-killer hits during `next build` typecheck.
    typescript: {
        ignoreBuildErrors: dockerBuild
    },
    eslint: {
        ignoreDuringBuilds: dockerBuild
    }
};

module.exports = nextConfig;
