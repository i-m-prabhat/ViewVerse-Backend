import path from "path";
import TerserPlugin from "terser-webpack-plugin";
import DotenvWebpackPlugin from "dotenv-webpack";


export default {
    target: "node",
    mode: "production", // "development" | "production" | "none"
    entry: "./src/index.js",
    output: {
        path: path.resolve(path.resolve(), "dist"),
        filename: "index.js",
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()]
    },
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
            {
                test: /\.html$/,
                use: 'html-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.mjs', '.hbs', '.json']
    },
    plugins: [
        new DotenvWebpackPlugin()
    ],
    stats: {
        all: true,
        errors: true,
        warnings: true
    }
}
