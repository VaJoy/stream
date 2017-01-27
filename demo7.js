/**
 * Created by vajoy on 2017/1/27.
 */
var Stream = require('stream');
var stream = new Stream();
stream.readable = true; //告诉 .pipe 这是个可读流

var c = 64;
var iv = setInterval(function () {
    if (++c >= 75) {
        clearInterval(iv);
        stream.emit('end');
    }
    else stream.emit('data', String.fromCharCode(c));
}, 100);

stream.pipe(process.stdout);