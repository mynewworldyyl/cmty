var dc = require('../dc.js')
//, mng = require('../js/manager.js');
,mongoCfg = require('../config.js').mongo
,express = require('express')
,mime = require('mime')
,path = require('path')
,gm = require('gm')
,apk = require('../config.js').apk
//,gulp = require('gulp')
//,imageResize = require('gulp-image-resize')
,fs = require('fs');

var apkName = apk.name+'_' +apk.version+'.apk';

var imageMagick = gm.subClass({ imageMagick: true });

var fu = express.Router();

var done = false;

var Db = require('mongodb').Db,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    ReplSetServers = require('mongodb').ReplSetServers,
    ObjectID = require('mongodb').ObjectID,
    Binary = require('mongodb').Binary,
    GridStore = require('mongodb').GridStore,
    Grid = require('mongodb').Grid,
    Code = require('mongodb').Code,
    BSON = require('mongodb').pure().BSON,
    assert = require('assert');

var GridFs = require('gridfs-stream');

var downloadPrefix = require('../config.js').ws.context + '/file/download?fileId=';

var db = null;
var gfs = null;
/*var __db1 = new Db(mongoCfg.database, new Server(mongoCfg.host, mongoCfg.port), {w: 1});
// Establish connection to db
__db1.open(function(err, db1) {
    if(err) {
        console.error(err);
    }else {
        db = db1;
    }
});*/

var idsrc = 1;

function getId() {
    return idsrc++;
}

// Connection URL
var url = 'mongodb://' + mongoCfg.host + ':' + mongoCfg.port + '/' + mongoCfg.database;
// Use connect method to connect to the Server
MongoClient.connect(url, function(err, db1) {
    if(err) {
        throw err;
    }
    //assert.equal(null, err);
    console.log("Connected correctly to server");
    db = db1;
    gfs = GridFs(db, require('mongodb'));
});

// create or use an existing mongodb-native db instance
//var db = new mongo.Db('yourDatabaseName', new mongo.Server("127.0.0.1", 27017));
//文件上传相关
//fu.use('*', function(req,res,next) {
   // console.log('req.url ' + req.url);
    //console.log('req.baseUrl ' + req.baseUrl);
    //console.log('req.origialUrl: ' + req.originalUrl);
   // console.log('req.origialUrl: ' + req.originalUrl);
    //console.log('req.path: ' + req.path);

    //next();
//});

fu.doSaveFile = function(req,res,cb) {
    var fs = req.files;
    var flag = false;
    for(var key in fs) {
        flag = true;
        var f = fs[key];
        //var dir = path.resolve(mongoCfg.tempUploadDir)
        var p = f.path;// path.join(dir,f.path);
        var mimeType = mime.lookup(p);
       // Our file ID
        var fileId = new ObjectID();
        // Open a new file
        var actId = req.session.act ? req.session.act.id:'';
        //req.body.createdOn = new Date()
        req.body.actId = actId;
        var opt = {
            content_type: mimeType,
            metadata : req.body
        };
        var gridStore = new GridStore(db, fileId, f.name, 'w',opt);
        // Open the new file
        gridStore.open(function(err, gridStore) {
            // Write the file to gridFS
            if(err ||!gridStore) {
                cb('文件读取失败');
            }
            gridStore.writeFile(p, function(err, doc) {
                if(err) {
                    console.error(err);
                    cb(err,null);
                }else {
                    gfs.findOne({ _id: fileId}, function (err, file) {
                        cb(null,file);
                    });
                }
                gridStore.close();
            });
        });
    }
    if(!flag) {
        cb('没文件数据');
    }
}


function doFileResponse(err, req, res,file) {
    if(err) {
        if(req.xhr || req.mobile) {
            var msg = "上传失败，网络异常";
            if( typeof err === 'string') {
                msg = err;
            }
            res.json({success:false,msg:msg});
            return;
        } else {
            //JSON.stringify()
            //console.log("test/fileupload");
            res.render("test/fileupload",{success:false,msg:'fail'});
        }
    } else {
        var url = downloadPrefix + file._id.toHexString();
        if(req.xhr || req.mobile) {
           // console.log({ success:true, msg:"上传成功",url:url });
            res.json({ success:true, msg:"上传成功",url:url });
            return;
        } else {
            //console.log("test/fileupload",{success:true,url:url, msg:"上传成功"});
            res.render("test/fileupload",{success:true,url:url, msg:"上传成功"});
        }
    }
}



fu.post('/mupload', function(req, res) {
    if(!req.xhr) {;
        req.mobile = true;
    }
    doUpload(req,res);
});

fu.post('/base64', function(req, res) {

    var body = req.body;

    if(!body.base64Data) {
       res.json({success:false,msg:'无数据或数据格式错误'});
        return;
    }

    var name = body.name + getId();
    var filePath = require('../config.js').mongo.tempUploadDir+'/'+name;

    var base64Data = body.base64Data.replace(/^data:image\/\w+;base64,/, "");
    var dataBuffer = new Buffer(base64Data, 'base64');

    fs.writeFile(filePath, dataBuffer, function (err) {
        if (err) {
            res.json({success:false, msg:'文件读了异常'})
            return;
        }

        var metadata = req.body;
        metadata.base64Data = null;

        var fileId = new ObjectID();
        // Open a new file
        var actId = req.session.act ? req.session.act.id:'';
        //req.body.createdOn = new Date()
        metadata.actId = actId;
        var opt = {
            content_type: 'image/jpg',
            metadata : metadata
        };

        var gridStore = new GridStore(db, fileId, metadata.name, 'w',opt);
        // Open the new file
        gridStore.open(function(err, gridStore) {
            // Write the file to gridFS
            if(err ||!gridStore) {
                res.json({success:false, msg:'文件读取异常'});
                return;
            }
            gridStore.writeFile(filePath, function(err1, doc) {
                console.log('It\'s saved!');
                if(err1) {
                    console.error(err1);
                    res.json({success:false, msg:'文件读取异常'});
                } else {
                    var url = downloadPrefix + fileId.toHexString();
                    res.json({ success:true, url:url })
                }
                gridStore.close();
                fs.unlinkSync(filePath);
                //fs.removeFile(filePath);
            });
        });

    });

});

fu.get('/dowbase64', function(req, res) {
    //dc.checkLogin(req,res);
    var fileId = req.query.fileId;
    doDownloadBase64(fileId,res);
});

var doDownloadBase64 = function( fileId,res ) {
    GridStore.exist(db,ObjectID(fileId),null,{ },function(err,exist){
        if(err || !exist) {
            res.end({success:false,msg:'文件未找到'});
        } else {
            var gs1 = new GridStore(db, ObjectID(fileId), 'r');
            // Open the read file
            //var datas = [];
            gs1.open(function(err, gs) {
                if(err) {
                    res.end({success:false,msg:'文件打开出错'});
                }
                // Register events
                // Create a stream to the file
                var stream = gs.stream(true);
                res.setHeader('Content-disposition', 'attachment; filename=' + gs.filename);
                res.setHeader('Content-type', gs.contentType);
                stream.pipe(res);
                gs1.close();
            });
        }
    });
}



fu.post('/upload', function(req, res) {
    //dc.checkLogin(req,res);
    console.log('do upload ')
    doUpload(req,res);
});

function doUpload(req,res) {
    if(!req.files || req.files.length <= 0) {
        doFileResponse("err", req, res)
    } else {
        fu.doSaveFile(req,res,function(err,file){
            doFileResponse(err, req, res, file);
        });
    }
}

function fineOne(module, req, res) {
    //-1：降序， 1 升序
    /*gfs.files.find({metadata:{module:module}}).sort({"createdOn.createdOn" : -1}).limit(20)
        .toArray(function (err, files) {
            if (err || files.length <= 0) {
                res.json({success:false, msg:'无相关信息'});
            }else {
                var f = files[0];
                var info = f.metadata;
                info.url = downloadPrefix+ f._id;
                info.success = true;
                res.json(info);
            }
        })*/

    db.collection('fs.files')
        .find({'metadata.module':module }).sort({"uploadDate" : -1}).limit(1)
        .toArray(function(err, files) {
            if (err || files.length <= 0) {
                res.json({success:false, msg:'无相关信息'});
            } else {
                var f = files[0];
                var info = f.metadata;
                info.url = downloadPrefix+ f._id;
                info.success = true;
                res.json(info);
            }
        });
}

fu.get('/apkinfo1',function(req,res){
    fineOne('apkUpdateFile',req,res);
});

fu.get('/deviceinfo',function(req,res) {
    fineOne('deviceUpdateFile', req, res);
})

fu.get('/',function(req,res){
    //dc.checkLogin(req,res);
    res.render("test/fileupload",{result:''});
});

var queryFileList = function(cb) {
    db.collection('fs.files')
        .find({})
        .toArray(function(err, files) {
            cb(files);
            /* files.forEach(function(file) {
             var gs = new mongodb.GridStore(db, file._id, 'r');
             ...
             });*/
        });
}

fu.get('/sfwUpload', function(req, res) {
    res.render("test/sfwUpload",{result:''});
});

fu.get('/sfwUpload1', function(req, res) {
    res.render("test/sfwUpload1",{result:''});
});

fu.get('/apkInfo', function(req, res) {
    res.json({success:true, apkInfo:apk});
});

fu.get('/apk', function(req, res) {
    var func = function(err) {
        if (err) {
            console.log(err);
            res.status(err.status).end();
        }
        else {
            console.log('Sent:', apkName);
        }
    }
    var paths = path.join(__dirname, '/s/'+apkName);
    res.download(paths, apkName, func);

    /*db.collection('fs.files')
        .find({'metadata.module':'apkUpdateFile' }).sort({"uploadDate" : -1}).limit(1)
        .toArray(function(err, files) {
            if (err || files.length <= 0) {
                res.json({success:false, msg:'无相关信息'});
            } else {
                var f = files[0];
                var info = f.metadata;
                info.url = downloadPrefix+ f._id;
                info.success = true;
                if(!req.query) {
                    req.query = {};
                }
                req.query.fileId = f._id;
                doDowloadCommonFile(req,res);
            }
        });*/

   /* var options = {
        root: path.join(__dirname, 'public/s'),
        dotfiles: 'deny',
        headers: {
            //'x-timestamp': Date.now(),
           // 'x-sent': true
            'Content-disposition':'attachment; filename=' + apkName
            ,'Content-type':mime.lookup(apkName)
        }
    };
    res.sendFile(apkName, options,func);*/


});

var count =1;
var doDowload = function( req,res ) {
    var fileId = req.query.fileId;
    GridStore.exist(db,ObjectID(fileId),null,{ },function(err,exist){
        if(err || !exist) {
            res.end("");
        } else {
            var gs1 = new GridStore(db, ObjectID(fileId), 'r');
            // Open the read file
            //var datas = [];
            gs1.open(function(err, gs) {
                if(err) {
                    throw err;
                }
                // Register events
                // Create a stream to the file
                var stream = gs.stream(true);
                res.setHeader('Content-disposition', 'attachment; filename=' + gs.filename);
                res.setHeader('Content-type', gs.contentType);

                if(req.query.width && req.query.height) {

                    /*
                      imageMagick(stream)
                        .resize(req.query.width, req.query.height, '!')
                        .stream()
                        .pipe(res);
                    */

                    /*imageMagick('d:\\fd\\dcprojects\\trunk\\server\\dcweb\\public\\images\\001.jpg')
                        //.resize(req.query.width, req.query.height, '!')
                        .noProfile()
                        .write('d:\\fd\\dcprojects\\trunk\\server\\dcweb\\uploads\\test.jpg', function (err) {
                            if (err) console.log(err);
                            res.end();
                        });*/

                        imageMagick(stream)
                            .resize(req.query.width, req.query.height, '!')
                            .noProfile()
                            .stream(function (err, stdout, stderr) {
                                if(err) {
                                    console.log(JSON.stringify(err));
                                    res.end();
                                } else {
                                    stdout.pipe(res);
                                    //stream.pipe(res);
                                }
                                gs1.close();
                        });

                   /*
                   gulp.task('default', function () {
                        gulp.stream(stream)
                            .pipe(imageResize({
                                width : req.query.width,
                                height : req.query.height,
                                crop : true,
                                upscale : false
                            }))
                            .pipe(res);
                        gs1.close();
                    });
                    */

                }else {
                    stream.pipe(res);
                    gs1.close();
                }

            });
        }
    });
}

var doDowloadCommonFile = function( req,res ) {
    var fileId = req.query.fileId;
    GridStore.exist(db,ObjectID(fileId),null,{ },function(err,exist){
        if(err || !exist) {
            res.end("");
        } else {
            var gs1 = new GridStore(db, ObjectID(fileId), 'r');
            gs1.open(function(err, gs) {
                if(err) {
                    throw err;
                }
                var stream = gs.stream(true);
                res.setHeader('Content-disposition', 'attachment; filename=' + gs.filename);
                res.setHeader('Content-type', gs.contentType);
                stream.pipe(res);
                gs1.close();
            });
        }
    });
}

fu.get('/download', function(req, res) {
    //dc.checkLogin(req,res);
    doDowload(req,res);
});

fu.get('/s', function(req, res) {

});

var mu = 1024*1024;
var getInfo = function(f) {
    var info = {};
    info.name = f.filename;
    info.size = f.length > mu ? ((f.length/mu).toFixed(2))+'M' : ((f.length/1024).toFixed(2))+'K';
    info.contentType= f.contentType;
    info.isImage = f.contentType.indexOf('image')===0;
    var d = f.uploadDate;
    info.uploadDate = d.getFullYear()+"-"+ d.getMonth()+"-" + d.getDate() + ' '+ d.getHours() + ':'+ d.getMinutes()+':' + d.getSeconds();
    info.metadata = JSON.stringify(f.metadata);
    return info;
}

fu.get('/list',function(req,res){
    queryFileList(function(files){
        res.locals.getInfo = getInfo;
        res.render("test/download",{files:files});
    })
});

fu.get('/delete',function(req,res){
    var fileId = req.query.fileId;
    var options = {_id:fileId};
    gfs.exist(options, function (err, found) {
        if(err || !found) {
            res.json({success:false,msg:'文件未找到'});
            return;
        }
        gfs.remove(options, function (err) {
            if( res.headersSent ){
                return;
            }
            if(err) {
                res.json({success:false,msg:'删除失败，未知错误'});
            }else {
                res.json({success:true});
            }
        });
});

  /*
    var collection = db.collection('fs.files');
    collection.findOne(null, { _id : fileId }, function (err, obj) {
        if(err) {
            res.json({success:false,msg:'文件未找到'});
            return;
        }
        obj.remove(function(err){
            if(err) {
                res.json({success:false,msg:'删除失败，未知错误'});
            }else {
                res.json({success:true});
            }
        })
    });
    */

   /*
   GridStore.exist(db,ObjectID(fileId),null,{},function(err,exist){
        if(err || !exist) {
            res.json({success:false,msg:'文件未找到'});
            return;
        }
        GridStore.unlink(db, null,{ _id:fileId }, function(err,gs) {
            if(err) {
                res.json({success:false,msg:'删除失败，未知错误'});
            }else {
                res.json({success:true});
            }
        });
    });
    */
});

module.exports = fu;