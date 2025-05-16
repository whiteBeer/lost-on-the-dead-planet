const path = require("node:path");

const nextConfig = {
    reactStrictMode: false,
    webpack(config) {
        return config;
    },
    serverRuntimeConfig: {
        buildDate: new Date().toISOString()
    },
    devIndicators: false
};

module.exports = nextConfig;
