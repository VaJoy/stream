/**
 * Created by vajoy on 2017/1/27.
 */
const Writable = require('stream').Writable;
const writable = Writable();

writable._write = (chunck, enc, next) => {
    // 输出打印
    console.log(chunck);   //Buffer
    //console.log(chunck.toString());  //转为String

    process.nextTick(next)
};

writable.write('Happy Chinese Year');
writable.end();


//Object Mode
const objectModeWritable = Writable({ objectMode: true });

objectModeWritable._write = (chunck, enc, next) => {
    // 输出打印
    console.log(typeof chunck);
    console.log(chunck);
    process.nextTick(next)
};

objectModeWritable.write('Happy Chinese Year');
objectModeWritable.write( { year : 2017 } );
objectModeWritable.end( 2017 );
