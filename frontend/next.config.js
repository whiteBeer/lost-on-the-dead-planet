const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
    basePath,
    reactStrictMode: false,
    devIndicators: false
};

module.exports = nextConfig;
