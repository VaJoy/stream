/**
 * Created by vajoy on 2017/1/27.
 */
'use strict';
const Readable = require('stream').Readable;

class ToReadable extends Readable {
    constructor(iterator) {
        super();
        this.iterator = iterator
    }
    _read() {
        const res = this.iterator.next();
        if (res.done) {
            // 迭代结束，顺便结束可读流
            return this.push(null)
        }
        // 将数据添加到流中
        this.push(res.value + '\n')
    }
}

const gen = function *(a){
    let count = 5,
        res = a;
    while(count--){
        res = res*res;
        yield res
    }
};

const readable = new ToReadable(gen(2));

// 监听`data`事件，一次获取一个数据
readable.on('data', data => process.stdout.write(data));

// 可读流消耗完毕
readable.on('end', () => process.stdout.write('readable stream ends~'));