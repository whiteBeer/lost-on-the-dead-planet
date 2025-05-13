const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = (env) => {

    console.log("Webpack build with:", env);

    return {
        entry: './index.tsx',

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
            publicPath: "/",
        },
        node: false,
        plugins: [
            new HtmlWebpackPlugin({
                template: "index.html",
            }),
            new Dotenv({
                path: "./.env." + env.environment
            })
        ],

        devServer: {
            port: 7790,
            historyApiFallback: true
        }
    }
};