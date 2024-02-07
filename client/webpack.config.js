const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './index.js',
    mode: 'development',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
    },
    node: false,
    plugins: [new HtmlWebpackPlugin({
        template: "index.html",
    })],
};