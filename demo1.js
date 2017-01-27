/**
 * Created by vajoy on 2017/1/26.
 */
'use strict';
const Readable = require('stream').Readable;
const rs = Readable();
const s = 'VaJoy';
const l = s.length;
let i = 0;
rs._read = ()=>{
    if(i == l){
        rs.push(' is my name');
        return rs.push(null)
    }
    rs.push(s[i++])
};
rs.pipe(process.stdout);