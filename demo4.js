/**
 * Created by vajoy on 2017/1/27.
 */

const Writable = require('stream').Writable;
const writable = Writable();

writable._write = (chunck, enc, next) => {
    // 输出打印
    process.stdout.write(chunck.toString().toUpperCase());
    // 写入完成时，调用`next()`方法通知流传入下一个数据
    process.nextTick(next)
};

// 所有数据均已写入底层
writable.on('finish', () => process.stdout.write('DONE'));

// 将一个数据写入流中
writable.write('a' + '\n');
writable.write('b' + '\n');
writable.write('c' + '\n');

// 再无数据写入流时，需要调用`end`方法
writable.end();