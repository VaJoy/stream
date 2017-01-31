'use strict';

var through2 = require('through2');
var sourcemaps = require('gulp-sourcemaps');
var duplexify = require('duplexify');
var prepareWrite = require('../prepareWrite');
var writeContents = require('./writeContents');

function dest(outFolder, opt) {
    if (!opt) {
        opt = {};
    }

    // _transform 接口
    function saveFile(file, enc, cb) {
        // 写入文件之前的准备处理，主要是 opt 初始化、file对象的 path/base/cwd 等属性
        // 修改为相对 outFolder 的路径，方便后面 writeContents 生成正确的目的文件
        prepareWrite(outFolder, file, opt, function(err, writePath) {
            if (err) {
                return cb(err);
            }
            //通过 fs.writeFile / fs.createWriteStream 等接口来写入和创建目标文件/文件夹
            writeContents(writePath, file, cb);
        });
    }

    // 生成 sourcemap 文件（注意这里的 opt.sourcemaps 若有则应为指定路径）
    var mapStream = sourcemaps.write(opt.sourcemaps);
    var saveStream = through2.obj(saveFile);
    // 合并为单条 duplex stream
    var outputStream = duplexify.obj(mapStream, saveStream);

    //生成目标文件/文件夹
    mapStream.pipe(saveStream);

    //依旧返回输出流（duplex stream）
    return outputStream;
}

module.exports = dest;