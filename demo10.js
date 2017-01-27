/**
 * Created by vajoy on 2017/1/27.
 */
const fs = require('fs');
const through2 = require('through2');
const csv2 = require('csv2');

let all = [];

fs.createReadStream('list.csv')
    .pipe(csv2())
    .pipe(through2.obj(function (chunk, enc, callback) {
        var data = {
            name: chunk[0],
            sex: chunk[1],
            addr: chunk[2]
        };
        this.push(data);

        callback()
    }))
    .on('data', function (data) {
        all.push(data)
    })
    .on('end', function () {
        console.log(all)
    });