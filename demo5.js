/**
 * Created by vajoy on 2017/1/27.
 */
'use strict';
const Duplex = require('stream').Duplex;
const duplex = Duplex();

duplex._read = function () {
    var date = new Date();
    this.push( date.getFullYear().toString() );
    this.push(null)
};

duplex._write = function (buf, enc, next) {
    console.log( buf.toString() + '\n' );
    next()
};

duplex.on('data', data => console.log( data.toString() ));

duplex.write('the year is');

duplex.end();