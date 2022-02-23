import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
export default {
  input: "scripts.js",
  output: {
    file: "bundle/bundle.js",
    format: "iife",
  },
  plugins: [
    nodeResolve(),
    commonjs({
      namedExports: {
        react: Object.keys(react),
        "react-dom": Object.keys(reactDom),
      },
    }),
  ],
  external: ["chartjs"],
};
