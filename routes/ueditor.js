var dc = require('../dc.js')
var mng = require('../js/manager.js')
var async = require('async');
var express = require('express');
var path = require('path');
var jsonConfig = require('./ueditorCfg.js')

var cfg = {

};
var ue = express.Router();

/*ue.post('/', function(req, res) {
    console.log('ue request');
    res.end("ss");
});*/

ue.all('/', function(req, res) {

    console.log('ue request')
    var action = req.query.action;
    if(!action || action == '') {
        res.end('success');
        return
    }
    if(res.headerSent) {
        return;
    }
   switch(action) {
       case 'config':
           return res.json(jsonConfig);
       case jsonConfig.imageActionName:
       case jsonConfig.snapscreenActionName:
       case jsonConfig.fileActionName:
       case jsonConfig.videoActionName:
           req.fu.doSaveFile(req,res,function(err,file){
                if(err) {
                   throw err;
                }
               var results = {
                   "state": "SUCCESS",
                   size:file.length,
                   title:file.filename,
                   type:file.contentType,
                   original: "",
                   url:'/bbs/file/download?fileId='+ file._id.toHexString()
               };
               res.json(results);
               return;
           });
           return;
       case jsonConfig.scrawlActionName:

           return;
       case jsonConfig.catcherActionName:

           return;
       case jsonConfig.imageManagerActionName:

           return;
       case jsonConfig.fileManagerActionName:

           return;
       default:
           res.end('fail');
           return;
   }
    return;
})


module.exports = ue;