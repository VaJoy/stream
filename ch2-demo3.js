/**
 * Created by vajoy on 2017/1/30.
 */
var Glob = require("glob").Glob;
var path = require('path');

var pattern = path.join(__dirname, '/*.txt');
var globber = new Glob(pattern, function(err, matches){
    console.log(matches)
});
globber.on('match', function(filename) {
    console.log('matches file: ' + filename)
});