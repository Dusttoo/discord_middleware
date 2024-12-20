const path = require("path");

module.exports = {
  entry: "./scripts/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
  },
  resolve: {
    extensions: [".js"],
    fallback: {"assert": false 
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
  externals: {
    dotenv: "commonjs dotenv",  
  },
  mode: "production", 
  devtool: "source-map",
  watch: true,
};