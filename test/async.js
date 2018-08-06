var async = require('async');

var fs = require('fs');

async.map(['main.js','orm.js','dc.js'], fs.stat, function(err, results){
    // results is now an array of stats for each file
    console.info("results:", results);
    console.info("err:", err);	
});

 console.log('===================async.filter begin=====================');
async.filter(['main.js','orm.js','dc2.js'], fs.exists, function(results){
    // results now equals an array of the existing files
	console.info("results:", results);
});
 console.log('===================async.filter begin=====================');

console.log('===================async.each begin=====================');
// assuming openFiles is an array of file names 
/*
async.each(openFiles, function(file, callback) {

  // Perform operation on file here.
  console.log('Processing file ' + file);

  if( file.length > 32 ) {
    console.log('This file name is too long');
    callback('File name too long');
  } else {
    // Do work to process file here
    console.log('File processed');
    callback();
  }
}, function(err){
    // if any of the file processing produced an error, err would equal that error
    if( err ) {
      // One of the iterations produced an error.
      // All processing will now stop.
      console.log('A file failed to process');
    } else {
      console.log('All files have been processed successfully');
    }
});
console.log('===================async.each begin=====================');
*/

console.log('===================async.series begin=====================');
async.series([
    function(callback){
        // do some stuff ...
        callback(null, 'one');
    },
    function(callback){
        // do some more stuff ...
        callback(null, 'two');
    }
],
// optional callback
function(err, results){
    // results is now equal to ['one', 'two']
	console.log('results',results);
});


// an example using an object instead of an array
async.series({
    one: function(callback){
        setTimeout(function(){
            callback(null, 1);
        }, 200);
    },
    two: function(callback){
        setTimeout(function(){
            callback(null, 2);
        }, 100);
    }
},
function(err, results) {
    // results is now equal to: {one: 1, two: 2}
	console.log('results',results);
});
console.log('===================async.series begin=====================');


console.log('===================async.parallel begin=====================');
async.parallel([
    function(callback){
        setTimeout(function(){
            callback(null, 'one');
        }, 200);
    },
    function(callback){
        setTimeout(function(){
            callback(null, 'two');
        }, 100);
    }
],
// optional callback
function(err, results){
    // the results array will equal ['one','two'] even though
    // the second function had a shorter timeout.
	console.log('results',results);
});

async.parallel({
    one: function(callback){
        setTimeout(function(){
            callback(null, 1);
        }, 200);
    },
    two: function(callback){
        setTimeout(function(){
            callback(null, 2);
        }, 100);
    }
},
function(err, results) {
    // results is now equals to: {one: 1, two: 2}
	console.log('results',results);
});

console.log('===================async.parallel end=====================');

//===================async.whilst end=====================
var count = 0;

async.whilst(
    function () { return count < 5; },
    function (callback) {
        count++;
        setTimeout(callback, 1000);
    },
    function (err) {
        // 5 seconds have passed
    }
);
//===================async.whilst end=====================




















