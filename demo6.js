/**
 * Created by vajoy on 2017/1/27.
 */
'use strict';
const Transform = require('stream').Transform;
class SetName extends Transform {
    constructor(name) {
        super();
        this.name = name || ''
    }
    // .write接口写入的数据，处理后直接从 data 事件的回调中可取得
    _transform(buf, enc, next) {
        var res = buf.toString().toUpperCase();
        this.push(res + this.name + '\n');
        next()
    }

}

var transform = new SetName('VaJoy');
transform.on('data', data => process.stdout.write(data));

transform.write('my name is ');
transform.write('here is ');
transform.end();