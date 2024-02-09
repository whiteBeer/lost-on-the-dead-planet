const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env) => {
    return {
        entry: env === "prod" ? './index.js' : './index.dev.js',
        mode: 'development',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'index.js',
        },
        node: false,
        plugins: [new HtmlWebpackPlugin({
            template: "index.html",
        })],
    }
};