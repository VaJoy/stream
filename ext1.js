'use strict';
const fs = require('fs');
const zlib = require('zlib');

const r = fs.createReadStream('data.txt');
const z = zlib.createGzip();
const w = fs.createWritableStream('data.txt.gz');
r.pipe(z).pipe(w);