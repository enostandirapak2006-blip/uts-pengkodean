import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['frontend-canvas/main.jsx'],bundle:true,minify:true,sourcemap:false,format:'esm',target:'es2020',outfile:'dist/canvas.js',define:{'process.env.NODE_ENV':'"production"'}});
await copyFile('frontend-canvas/index.html','dist/index.html');
console.log('Canvas bundle built in dist/');
