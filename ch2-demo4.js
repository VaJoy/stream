/**
 * Created by vajoy on 2017/1/31.
 */
var mm = require('micromatch');
var isMatch = mm.matcher('*.md');
var files = [];

['a.md', 'b.txt', 'c.md'].forEach(function(fp) {
    if (isMatch(fp)) {
        files.push(fp);
    }
});

console.log(files);  //[ 'a.md', 'c.md' ]