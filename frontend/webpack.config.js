const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env) => {
    return {
        entry: env.prod ? './index.ts' : './index.dev.ts',

        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },

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