import { terser } from "rollup-plugin-terser";
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const minify = process.env.ENV === 'PRODUCTION';

export default {
  input: 'src/app.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
  },
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    minify && terser(),
  ],
};
