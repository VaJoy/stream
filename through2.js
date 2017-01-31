var Transform = require('readable-stream/transform'),
    inherits = require('util').inherits,
    xtend = require('xtend');

//构造方法，继承了Transform
function DestroyableTransform(opts) {
    Transform.call(this, opts);
    this._destroyed = false
}

inherits(DestroyableTransform, Transform);

//原型接口 destroy，用于关闭当前流
DestroyableTransform.prototype.destroy = function (err) {
    if (this._destroyed) return;
    this._destroyed = true;

    var self = this;
    process.nextTick(function () {
        if (err)
            self.emit('error', err);
        self.emit('close')
    })
};

// a noop _transform function
function noop(chunk, enc, callback) {
    callback(null, chunk)
}


// 闭包，用于返回对外接口方法
function through2(construct) {
    //最终返回此匿名函数
    return function (options, transform, flush) {
        if (typeof options == 'function') {
            flush = transform
            transform = options
            options = {}
        }

        if (typeof transform != 'function')
            transform = noop

        if (typeof flush != 'function')
            flush = null

        return construct(options, transform, flush)
    }
}


// 出口，执行 throuh2 闭包函数，返回一个 DestroyableTransform 的实例（t2）
module.exports = through2(function (options, transform, flush) {
    //t2 为 Transform Stream 对象
    var t2 = new DestroyableTransform(options);

    //Transform Streams 的内置接口 _transform(chunk, encoding, next) 方法
    t2._transform = transform;

    if (flush)
        t2._flush = flush;

    return t2
});


// 对外暴露一个可以直接 new （或者不加 new）来创建实例的的构造函数
module.exports.ctor = through2(function (options, transform, flush) {
    function Through2(override) {
        if (!(this instanceof Through2))
            return new Through2(override)

        this.options = xtend(options, override)

        DestroyableTransform.call(this, this.options)
    }

    inherits(Through2, DestroyableTransform)

    Through2.prototype._transform = transform

    if (flush)
        Through2.prototype._flush = flush

    return Through2
})

//Object Mode接口的简易封装
module.exports.obj = through2(function (options, transform, flush) {
    var t2 = new DestroyableTransform(xtend({objectMode: true, highWaterMark: 16}, options))

    t2._transform = transform

    if (flush)
        t2._flush = flush

    return t2
})