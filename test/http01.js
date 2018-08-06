var http = require('http');

//console.log(http.METHODS);
//console.log(http.STATUS_CODES);

var os = require('os');

console.info(os.hostname());

console.info("os.type() ", os.type());

console.info("os.endianness() ", os.endianness());

console.info("os.platform() ", os.platform());

console.info("os.arch() ", os.arch());

console.info("os.cpus() ", os.cpus());

var qs = require('querystring');

console.info(qs.stringify({ foo: 'bar', baz: ['qux', 'quux'], corge: '' }));
var json = qs.stringify({ foo: 'bar', baz: ['qux', 'quux'], corge: '' });
console.info(qs.parse(json));

var as = require('async');

as.forEach();

