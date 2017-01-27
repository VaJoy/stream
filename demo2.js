//demo2
var http = require('http');
var fs = require('fs');

var server = http.createServer(function (req, res) {
    fs.readFile(__dirname + '/data.txt', function (err, data) {
        res.end(data);
    });
});
server.listen(3000);

var server2 = http.createServer(function (req, res) {
    var stream = fs.createReadStream(__dirname + '/data.txt');
    stream.pipe(res);
});
server2.listen(4000);



var Readable = require('stream').Readable;

var rs = new Readable;
rs.push('servers ');
rs.push('are listening on\n');
rs.push('3000 and 4000\n');
rs.push(null);

rs.pipe(process.stdout);