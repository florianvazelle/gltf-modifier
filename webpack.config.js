var HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: process.env.NODE_ENV || "development",
  entry: __dirname + "/src/main.js",
  output: {
    path: __dirname + "/public/main",
    filename: "main.js",
  },
  devServer: {
    contentBase: "./public",
    historyApiFallback: true,
    inline: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test: /\.gltf$/,
        loader: '@vxna/gltf-loader',
        options: { inline: true }
      },
      {
        test: /\.(bin|jpe?g|png|hdr)$/,
        loader: 'file-loader',
        options: { esModule: false }
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "Output Management",
      template: "./index.html",
    }),
  ],
};
