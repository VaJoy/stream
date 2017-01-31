/**
 * Created by vajoy on 2017/1/29.
 */
var Vinyl = require('vinyl');

var file = new Vinyl({
    cwd: '/',
    base: '/test/',
    path: '/test/newFile.txt',
    contents: new Buffer('abc')
});


console.log(file.contents.toString());
console.log('path is: ' + file.path);
console.log('basename is: ' + file.basename);
console.log('filename without suffix: ' + file.stem);
console.log('file extname is: ' + file.extname);