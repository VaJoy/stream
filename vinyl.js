var path = require('path');
var clone = require('clone');
var cloneStats = require('clone-stats');
var cloneBuffer = require('./lib/cloneBuffer');
var isBuffer = require('./lib/isBuffer');
var isStream = require('./lib/isStream');
var isNull = require('./lib/isNull');
var inspectStream = require('./lib/inspectStream');
var Stream = require('stream');
var replaceExt = require('replace-ext');

//构造函数
function File(file) {
    if (!file) file = {};

    //-------------配置项缺省设置
    // history是一个数组，用于记录 path 的变化
    var history = file.path ? [file.path] : file.history;
    this.history = history || [];

    this.cwd = file.cwd || process.cwd();
    this.base = file.base || this.cwd;

    // 文件stat，它其实就是 require('fs').Stats 对象
    this.stat = file.stat || null;

    // 文件内容（这里其实只允许格式为 stream 或 buffer 的传入）
    this.contents = file.contents || null;

    this._isVinyl = true;

}

//判断是否 this.contents 是否 Buffer 类型
File.prototype.isBuffer = function() {
    //直接用 require('buffer').Buffer.isBuffer(this.contents) 做判断
    return isBuffer(this.contents);
};

//判断是否 this.contents 是否 Stream 类型
File.prototype.isStream = function() {
    //使用 this.contents instanceof Stream 做判断
    return isStream(this.contents);
};

//判断是否 this.contents 是否 null 类型（例如当file为文件夹路径时）
File.prototype.isNull = function() {
    return isNull(this.contents);
};

//通过文件 stat 判断是否为文件夹
File.prototype.isDirectory = function() {
    return this.isNull() && this.stat && this.stat.isDirectory();
};

//克隆对象，opt.deep 决定是否深拷贝
File.prototype.clone = function(opt) {
    if (typeof opt === 'boolean') {
        opt = {
            deep: opt,
            contents: true
        };
    } else if (!opt) {
        opt = {
            deep: true,
            contents: true
        };
    } else {
        opt.deep = opt.deep === true;
        opt.contents = opt.contents !== false;
    }

    // 先克隆文件的 contents
    var contents;
    if (this.isStream()) {  //文件内容为Stream
        //Stream.PassThrough 接口是 Transform 流的一个简单实现，将输入的字节简单地传递给输出
        contents = this.contents.pipe(new Stream.PassThrough());
        this.contents = this.contents.pipe(new Stream.PassThrough());
    } else if (this.isBuffer()) {  //文件内容为Buffer
        /** cloneBuffer 里是通过
         * var buf = this.contents;
         * var out = new Buffer(buf.length);
         * buf.copy(out);
         * 的形式来克隆 Buffer
        **/
        contents = opt.contents ? cloneBuffer(this.contents) : this.contents;
    }

    //克隆文件实例对象
    var file = new File({
        cwd: this.cwd,
        base: this.base,
        stat: (this.stat ? cloneStats(this.stat) : null),
        history: this.history.slice(),
        contents: contents
    });

    // 克隆自定义属性
    Object.keys(this).forEach(function(key) {
        // ignore built-in fields
        if (key === '_contents' || key === 'stat' ||
            key === 'history' || key === 'path' ||
            key === 'base' || key === 'cwd') {
            return;
        }
        file[key] = opt.deep ? clone(this[key], true) : this[key];
    }, this);
    return file;
};

/**
 * pipe原型接口定义
 * 用于将 file.contents 写入流（即参数stream）中；
 * opt.end 用于决定是否关闭 stream
 */
File.prototype.pipe = function(stream, opt) {
    if (!opt) opt = {};
    if (typeof opt.end === 'undefined') opt.end = true;

    if (this.isStream()) {
        return this.contents.pipe(stream, opt);
    }
    if (this.isBuffer()) {
        if (opt.end) {
            stream.end(this.contents);
        } else {
            stream.write(this.contents);
        }
        return stream;
    }

    // file.contents 为 Null 的情况不往stream注入内容
    if (opt.end) stream.end();
    return stream;
};

/**
 * inspect原型接口定义
 * 用于打印出一条与文件内容相关的字符串（常用于调试打印）
 * 该方法可忽略
 */
File.prototype.inspect = function() {
    var inspect = [];

    // use relative path if possible
    var filePath = (this.base && this.path) ? this.relative : this.path;

    if (filePath) {
        inspect.push('"'+filePath+'"');
    }

    if (this.isBuffer()) {
        inspect.push(this.contents.inspect());
    }

    if (this.isStream()) {
        //inspectStream模块里有个有趣的写法——判断是否纯Stream对象，先判断是否Stream实例，
        //再判断 this.contents.constructor.name 是否等于'Stream'
        inspect.push(inspectStream(this.contents));
    }

    return '<File '+inspect.join(' ')+'>';
};

/**
 * 静态方法，用于判断文件是否Vinyl对象
 */
File.isVinyl = function(file) {
    return file && file._isVinyl === true;
};

// 定义原型属性 .contents 的 get/set 方法
Object.defineProperty(File.prototype, 'contents', {
    get: function() {
        return this._contents;
    },
    set: function(val) {
        //只允许写入类型为 Buffer/Stream/Null 的数据，不然报错
        if (!isBuffer(val) && !isStream(val) && !isNull(val)) {
            throw new Error('File.contents can only be a Buffer, a Stream, or null.');
        }
        this._contents = val;
    }
});

// 定义原型属性 .relative 的 get/set 方法（该方法几乎不使用，可忽略）
Object.defineProperty(File.prototype, 'relative', {
    get: function() {
        if (!this.base) throw new Error('No base specified! Can not get relative.');
        if (!this.path) throw new Error('No path specified! Can not get relative.');
        //返回 this.path 和 this.base 的相对路径
        return path.relative(this.base, this.path);
    },
    set: function() {
        //不允许手动设置
        throw new Error('File.relative is generated from the base and path attributes. Do not modify it.');
    }
});

// 定义原型属性 .dirname 的 get/set 方法，用于获取/设置指定path文件的文件夹路径。
// 要求初始化时必须指定 path <或history>
Object.defineProperty(File.prototype, 'dirname', {
    get: function() {
        if (!this.path) throw new Error('No path specified! Can not get dirname.');
        return path.dirname(this.path);
    },
    set: function(dirname) {
        if (!this.path) throw new Error('No path specified! Can not set dirname.');
        this.path = path.join(dirname, path.basename(this.path));
    }
});

// 定义原型属性 .basename 的 get/set 方法，用于获取/设置指定path路径的最后一部分。
// 要求初始化时必须指定 path <或history>
Object.defineProperty(File.prototype, 'basename', {
    get: function() {
        if (!this.path) throw new Error('No path specified! Can not get basename.');
        return path.basename(this.path);
    },
    set: function(basename) {
        if (!this.path) throw new Error('No path specified! Can not set basename.');
        this.path = path.join(path.dirname(this.path), basename);
    }
});

// 定义原型属性 .extname 的 get/set 方法，用于获取/设置指定path的文件扩展名。
// 要求初始化时必须指定 path <或history>
Object.defineProperty(File.prototype, 'extname', {
    get: function() {
        if (!this.path) throw new Error('No path specified! Can not get extname.');
        return path.extname(this.path);
    },
    set: function(extname) {
        if (!this.path) throw new Error('No path specified! Can not set extname.');
        this.path = replaceExt(this.path, extname);
    }
});

// 定义原型属性 .path 的 get/set 方法，用于获取/设置指定path。
Object.defineProperty(File.prototype, 'path', {
    get: function() {
        //直接从history出栈
        return this.history[this.history.length - 1];
    },
    set: function(path) {
        if (typeof path !== 'string') throw new Error('path should be string');

        // 压入history栈中
        if (path && path !== this.path) {
            this.history.push(path);
        }
    }
});

module.exports = File;