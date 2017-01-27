/**
 * Created by vajoy on 2017/1/27.
 */
const fs = require('fs');
const through2 = require('through2');
fs.createReadStream('data.txt')
    .pipe(through2(function (chunk, enc, callback) {
        for (var i = 0; i < chunk.length; i++)
            if (chunk[i] == 97)
                chunk[i] = 122; // 把 'a' 替换为 'z'

        this.push(chunk);

        callback()
    }))
    .pipe(fs.createWriteStream('out.txt'))
    .on('finish', ()=> {
        console.log('DONE')
    });