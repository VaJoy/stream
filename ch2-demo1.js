/**
 * Created by vajoy on 2017/1/29.
 */

var Vinyl = require('vinyl');

var jsFile = new Vinyl({
    cwd: '/',
    base: '/test/',
    path: '/test/file.js',
    contents: new Buffer('abc')
});

var emptyFile = new Vinyl();

console.dir(jsFile);
console.dir(emptyFile);