'use strict';

var assign = require('object-assign');
var through = require('through2');
var gs = require('glob-stream');
var File = require('vinyl');
var duplexify = require('duplexify');
var merge = require('merge-stream');
var sourcemaps = require('gulp-sourcemaps');
var filterSince = require('../filterSince');
var isValidGlob = require('is-valid-glob');

var getContents = require('./getContents');
var resolveSymlinks = require('./resolveSymlinks');

function createFile(globFile, enc, cb) {
    //通过传入 globFile 来创建一个 vinyl 文件对象
    //并赋予 cb 回调（这个回调一看就是 transform 的格式，将vinyl 文件对象注入流中）
    cb(null, new File(globFile));
}

function src(glob, opt) {
    // 配置项初始化
    var options = assign({
        read: true,
        buffer: true,
        sourcemaps: false,
        passthrough: false,
        followSymlinks: true
    }, opt);

    var inputPass;

    // 判断是否有效的 glob pattern
    if (!isValidGlob(glob)) {
        throw new Error('Invalid glob argument: ' + glob);
    }

    // 通过 glob-stream 创建匹配到的 globStream
    var globStream = gs.create(glob, options);

    //加工处理生成输出流
    var outputStream = globStream
        //globFile.path 为 symlink的情况下，转为硬链接
        .pipe(resolveSymlinks(options))
        //创建 vinyl 文件对象供下游处理
        .pipe(through.obj(createFile));

    // since 可赋与一个 Date 或 number，来要求指定某时间点后修改过的文件
    if (options.since != null) {
        outputStream = outputStream
            // 通过 through2-filter 检测 file.stat.mtime 来过滤
            .pipe(filterSince(options.since));
    }

    // read 选项默认为 true，表示允许文件内容可读（为 false 时不可读 且将无法通过 .dest 方法写入硬盘）
    if (options.read !== false) {
        outputStream = outputStream
            //获取文件内容，写入file.contents 属性去。
            //预设为 Buffer 时通过 fs.readFile 接口获取
            //否则为 Stream 类型，通过 fs.createReadStream 接口获取
            .pipe(getContents(options));
    }

    // passthrough 为 true 时则将 Transform Stream 转为 Duplex 类型（默认为false）
    if (options.passthrough === true) {
        inputPass = through.obj();
        outputStream = duplexify.obj(inputPass, merge(outputStream, inputPass));
    }

    //是否要开启 sourcemap（默认为false），若为 true 则将流推送给 gulp-sourcemaps 去初始化，
    //后续在 dest 接口里再调用 sourcemaps.write(opt.sourcemaps) 将 sourcemap 文件写入流
    if (options.sourcemaps === true) {
        outputStream = outputStream
            .pipe(sourcemaps.init({loadMaps: true}));
    }
    globStream.on('error', outputStream.emit.bind(outputStream, 'error'));
    return outputStream;
}

module.exports = src;