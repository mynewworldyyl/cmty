var express = require('express')
  , http = require('http')
  , path = require('path')
  , dc = require('./dc.js')
  , userCenter = require('./routes/usercenter.js')
  , bbs = require('./routes/bbs.js')
  //, cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
    , session = require('cookie-session')
    , mng = require('./js/manager.js')
  //, logger = require('logger')
    , async = require('async')
    , cfg = require('./config.js').ws
    ;
  ;

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1,                 //月份
        "d+": this.getDate(),                    //日
        "h+": this.getHours(),                   //小时
        "m+": this.getMinutes(),                 //分
        "s+": this.getSeconds(),                 //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds()             //毫秒
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

Date.prototype.dateStr = function() {
    var today = new Date();
    var date = this;
    var timeStr = date.format('hh:ss');
    var dateStr = null;
    if(today.format('yyyyMM') == date.format('yyyyMM')) {
        var di = today.getDate() - date.getDate();
        if(di == 0) {
            dateStr = '今天 ' +timeStr;
        }else if(di == 1) {
            dateStr = '昨天 ' + timeStr;
        }else if(di ==2) {
            dateStr = '前天 ' + timeStr;
        }else {
            dateStr = date.format('yyyy/MM/dd') + ' ' + timeStr;
        }
    }else {
        dateStr = date.format('yyyy/MM/dd') + ' ' + timeStr;
    }
    return dateStr;
}

String.prototype.startWith=function(str){
    var reg=new RegExp("^"+str);
    return reg.test(this);
}

String.prototype.endWith=function(str){
    var reg=new RegExp(str+"$");
    return reg.test(this);
}


if(!dc) {
  console.log('dc not found');
}

var app = express();

app.use(dc.log4js.connectLogger(dc.logger, {level:dc.log4js.levels.DEBUG}));
//app.logger = dc.logger;

app.set('port', process.env.PORT || cfg.port);
app.set('views', __dirname + '/views');
//app.set('view engine', 'ejs');
app.engine('.html', require('ejs').renderFile);  
app.set('view engine', 'html');  

//session setting
app.set('trust proxy', 1) // trust first proxy 
app.use(session({
  keys: ['key1', 'key2'],
  maxAge: 10*60*1000
}))

// load the cookie parsing middleware
//app.use(cookieParser());
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
//app.use(cookieParser);

//app.use(express.favicon());
//app.use(logger);
//app.use(express.bodyParser());
//app.use(express.methodOverride());
//app.use(express.cookieParser('your secret here'));
//app.use(express.session());
//app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'mainpage')));
app.use(express.static(path.join(__dirname, 'views')));
/*
app.configure('development', function(){
  app.use(express.errorHandler());
});
*/

app.use([cfg.context,'/finder','/im'], function(req, res, next){
    var loginPaths = cfg.needLoginPath;
    var baseUrl = req.originalUrl;
    var match = false;
    //console.log("baseURL: "+baseUrl);
    if(baseUrl == '' || baseUrl == '/') {
        next();
        return;
    } else {
        var i = 0;
        for( ; i < loginPaths.length; i++) {
            var index = baseUrl.indexOf(loginPaths[i]);
            if(index > -1) {
                match = true;
                //已经找到匹配路径,做登录处理
                //console.log("need Login: "+ baseUrl);
                var flag = dc.checkLogin(req,res,function(err,result){
                    if(err) {
                        //登录失败
                        res.json({success:false,msg:err,code:'notLogin'});
                        return;
                    } else {
                        //登录成功
                        next();
                        return;
                    }
                });
                if(flag) {
                    //已经登录，可以继续next()
                    next();
                    return;
                }
                //没有登录，交由checkLogin的回调函数处理
            }
        }
        if(!match) {
            //没有找到匹配路径，无需登录情况
            next();
        }
    }
})

//文件上传中间件
//var fileUploadfileUpload = require('./routes/fileupload.js');

var multer  = require('multer')

app.use([cfg.context+'/file',cfg.context+'/ue'],multer({ dest:
    require('./config.js').mongo.tempUploadDir,
    rename: function (fieldname, filename) {
        console.log(' get name for: ' +filename)
        return filename + Date.now();
    },
    onFileUploadStart: function (file) {
        console.log(file.originalname + ' is starting ...')
    },
    onFileUploadComplete: function (file) {
        console.log(file.fieldname + ' uploaded to  ' + file.path)
    }
}));


app.use(cfg.context+'/ue',function(req,res,next){
    req.fu = fileUpload;
    next();
});

app.use(cfg.context, function(req, res, next){
    if(!res.headersSent) {
        res.setHeader("Cache-Control", "no-cache, no-store"); //HTTP 1.1
        res.setHeader("Pragma", "no-cache"); //HTTP 1.0
        res.setHeader("Expires", 0); //
    }

    if(req.originalUrl.indexOf('/bbs/file') < 0) {
        mng.topicManager.getTopicHeadData(function(err,result){
            req.headerData = result;
            //console.log('do header data query successfully');
            next();
        })
    }else {
        next();
    }
    //console.log('do header data query');
})

//取BBS主页
app.get(cfg.context, function(req, res) {
    console.log("main");
    async.parallel({tts:function(callback){
        mng.topicManager.queryTopicTypes(function(tl){
            callback(null,tl);
        });
    }
    },function(error,result){
        dc.render('main',req,res,
            { act:req.session.act,userInfo: req.session.userInfo,topicTypeList : result.tts, cxt:cfg.context,
                scripts:dc.uijs})
    })

})

//取高级用户管理页
app.get(cfg.context + '/admin.html', function(req, res) {
    console.log("admin");
    dc.render('admin',req,res,{ userInfo: req.session.userInfo, success:false, act: req.session.act,
        result:null, cxt:cfg.context})
    //res.render('admin', { userInfo: req.session.userInfo, success:false, result:null});
})

app.get('/pcfg', function(req, res) {
    res.json(cfg.needLoginPath);
})

//文件上传相关
app.use(cfg.context + '/file', fileUpload);

//用户账号相关
app.use(cfg.context + '/uc', userCenter);

//BBS相关
app.use(cfg.context + '/bbs', bbs);

//finder
app.use('/finder',require('./routes/finder.js'));

//BBS相关
app.use(cfg.context + '/ue', require('./routes/ueditor.js'));

//weixin相关
//var wechat = require('wechat');
//app.use(express.query());

app.use('/wx', require('./routes/wx.js'));

//im
var im = require('./routes/im.js');
app.use('/im',im);

//bg
var bg = require('./routes/bgWorker.js');
app.use('/bg',bg);

//var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(cfg.port);

/*app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});*/

im.initIm(io);
bg.initWorker(io);

//var server = http.createServer(app);
//var http = require('http').Server(app);
//var server = app.listen(3000);
//var io = require('socket.io').listen(server);;

/* io.configure('development', function(){
 //debug
 io.set('log level', 3);
 });

 io.configure('release', function(){
 //debug
 io.set('log level', 1);
 });*/


//io.set('transports', ['websocket']);
//io.enable('browser client etag');
//io.set('heartbeat interval', 60000);

/*wsk = io*//*.of('/wsk')*//*
    .on('connection', function(socket){
        im.onConnection(socket);
    });

app.listen(cfg.port, function(){
    console.log("Express server listening on port " + app.get('port'));
});*/



//启动node

