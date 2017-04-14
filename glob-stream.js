/**
 * Created by vajoy on 2017/1/31.
 */
'use strict';

var through2 = require('through2');
var Combine = require('ordered-read-streams');
var unique = require('unique-stream');

var glob = require('glob');
var micromatch = require('micromatch');
var resolveGlob = require('to-absolute-glob');
var globParent = require('glob-parent');
var path = require('path');
var extend = require('extend');

var gs = {
    // 为单个 glob 创建流
    createStream: function(ourGlob, negatives, opt) {

        // 使用 path.resolve 将 golb 转为绝对路径（加上 cwd 前缀）
        ourGlob = resolveGlob(ourGlob, opt);
        var ourOpt = extend({}, opt);
        delete ourOpt.root;

        // 通过 glob pattern 生成一个 Glob 对象（属于一个事件发射器<EventEmitter>）
        var globber = new glob.Glob(ourGlob, ourOpt);

        // 抽取出 glob 的根路径
        var basePath = opt.base || globParent(ourGlob) + path.sep;

        // Create stream and map events from globber to it
        var stream = through2.obj(opt,
            negatives.length ? filterNegatives : undefined);

        var found = false;

        //Glob 对象开始注册事件
        globber.on('error', stream.emit.bind(stream, 'error'));
        globber.once('end', function() {
            if (opt.allowEmpty !== true && !found && globIsSingular(globber)) {
                stream.emit('error',
                    new Error('File not found with singular glob: ' + ourGlob));
            }

            stream.end();
        });

        //注册匹配到文件时的事件回调
        globber.on('match', function(filename) {
            //标记已匹配到文件（filename 为文件路径）
            found = true;
            //写入流（触发 stream 的 _transform 内置方法）
            stream.write({
                cwd: opt.cwd,
                base: basePath,
                path: path.normalize(filename)
            });
        });

        return stream;

        //定义 _transform 方法，过滤掉排除模式所排除的文件
        function filterNegatives(filename, enc, cb) {
            //filename 是匹配到的文件对象，其实这里叫file更合适。通过filename.path可获取文件的路径
            var matcha = isMatch.bind(null, filename);
            if (negatives.every(matcha)) {
                cb(null, filename); //把匹配到的文件推送入缓存（供下游消费）
            } else {
                cb(); // 忽略
            }
        }
    },

    // 为多个globs创建流
    create: function(globs, opt) {
        //预设参数处理
        if (!opt) {
            opt = {};
        }
        if (typeof opt.cwd !== 'string') {
            opt.cwd = process.cwd();
        }
        if (typeof opt.dot !== 'boolean') {
            opt.dot = false;
        }
        if (typeof opt.silent !== 'boolean') {
            opt.silent = true;
        }
        if (typeof opt.nonull !== 'boolean') {
            opt.nonull = false;
        }
        if (typeof opt.cwdbase !== 'boolean') {
            opt.cwdbase = false;
        }
        if (opt.cwdbase) {
            opt.base = opt.cwd;
        }

        //如果 glob（第一个参数）非数组，那么把它转为 [glob]，方便后续调用 forEach 方法
        if (!Array.isArray(globs)) {
            globs = [globs];
        }

        var positives = [];
        var negatives = [];

        var ourOpt = extend({}, opt);
        delete ourOpt.root;

        //遍历传入的 glob
        globs.forEach(function(glob, index) {
            //验证 glob 是否有效
            if (typeof glob !== 'string' && !(glob instanceof RegExp)) {
                throw new Error('Invalid glob at index ' + index);
            }

            //是否排除模式（如“!b*.js”）
            var globArray = isNegative(glob) ? negatives : positives;

            // 排除模式的 glob 初步处理
            if (globArray === negatives && typeof glob === 'string') {
                // 使用 path.resolve 将 golb 转为绝对路径（加上 cwd 前缀）
                var ourGlob = resolveGlob(glob, opt);
                //micromatch.matcher(ourGlob, ourOpt) 返回了一个方法，可传入文件路径作为参数，来判断是否匹配该排除模式的 glob（即返回Boolean）
                //可参考 ch2-demo4 里的代码
                glob = micromatch.matcher(ourGlob, ourOpt);
            }

            globArray.push({
                index: index,
                glob: glob
            });
        });

        //globs必须最少有一个匹配模式（即非排除模式）的glob，否则报错
        if (positives.length === 0) {
            throw new Error('Missing positive glob');
        }

        // 只有一条匹配模式，直接生成流并返回
        if (positives.length === 1) {
            return streamFromPositive(positives[0]);
        }

        // 创建 positives.length 个独立的流（数组）
        var streams = positives.map(streamFromPositive);

        // 这里使用了 ordered-read-streams 模块将一个数组的 Streams 合并为单个 Stream
        var aggregate = new Combine(streams);
        //对合成的 Stream 进行去重处理（以“path”属性为指标）
        var uniqueStream = unique('path');
        var returnStream = aggregate.pipe(uniqueStream);

        aggregate.on('error', function(err) {
            returnStream.emit('error', err);
        });

        return returnStream;

        //返回最终匹配完毕（去除了排除模式globs的文件）的文件流
        function streamFromPositive(positive) {
            var negativeGlobs = negatives.filter(indexGreaterThan(positive.index))  //过滤，排除模式的glob必须排在匹配模式的glob后面
                .map(toGlob); //返回该匹配模式glob后面的全部排除模式globs（数组形式）
            return gs.createStream(positive.glob, negativeGlobs, opt);
        }
    }
};

function isMatch(file, matcher) {
    //matcher 即单个排除模式的 glob 方法（可传入文件路径作为参数，来判断是否匹配该排除模式的 glob）
    //此举是拿匹配到的文件（file）和排除模式GLOP规则做匹配，若相符（如“a/b.txt”匹配“!a/c.txt”）则为true
    if (typeof matcher === 'function') {
        return matcher(file.path);
    }
    if (matcher instanceof RegExp) {
        return matcher.test(file.path);
    }
}

function isNegative(pattern) {
    if (typeof pattern === 'string') {
        return pattern[0] === '!';
    }
    if (pattern instanceof RegExp) {
        return true;
    }
}

function indexGreaterThan(index) {
    return function(obj) {
        return obj.index > index;
    };
}

function toGlob(obj) {
    return obj.glob;
}

function globIsSingular(glob) {
    var globSet = glob.minimatch.set;

    if (globSet.length !== 1) {
        return false;
    }

    return globSet[0].every(function isString(value) {
        return typeof value === 'string';
    });
}

module.exports = gs;
