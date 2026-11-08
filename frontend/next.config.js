const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
    basePath,
    output: "standalone",
    reactStrictMode: false,
    devIndicators: false
};

module.exports = nextConfig;
