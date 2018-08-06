var express = require('express');
var utils = require('util');
var dc = require('../dc.js');
var cfg =  require('../config.js').wx;
var request = require('request');
var wechat = require('wechat');
var API = new require('wechat-api');
var ejs = require('ejs');

var wapi = new API(cfg.appID,cfg.appSecret);

var wx = express.Router();
var logger = dc.logger;

wx.use('/notjs', express.query());

//var tpl = '';

//var compiled = ejs.compile(tpl);

var menus = {
    "button":[
        {
            "type":"view",
            "name":"主页",
            "url":"http://www.dowcool.com/wx/js/main"
        },
        {
            "type":"view",
            "name":"官网",
            "url":"http://www.dowcool.com/www/login.html"
        },
        {
            "type":"click",
            "name":"赞",
            "key":"V1001_GOOD"
        }]
}
/*
wapi.createMenu(menus,function(err,result){
 if(err) {
	logger.debug(err);
 }else {
	logger.debug(result);
 }
 });
*/

var wxmw = wechat(cfg.Token)
    .text(function (msg, req, res, next) {
        res.reply(msg.Content);
       /* wapi.sendText(msg.FromUserName,'这是客服消息',function(err,result){
            if(err) {
                logger.error(err);
            }else {
                logger.debug(result);
            }
        });*/
    })
    .image(function (msg, req, res, next) {
        // TODO
    })
    .voice(function (msg, req, res, next) {
        // TODO
    })
    .video(function (msg, req, res, next) {
        // TODO
    })
    .location(function (msg, req, res, next) {
        // TODO
    })
    .link(function (msg, req, res, next) {
        // TODO
    })
    .event(function (msg, req, res, next) {
        // TODO
        var h = eventHandlers[msg.Event];
        if(h) {
            h(msg, req, res, next);
        }else {
            next();
        }
        //res.reply('eventType: '+ msg.Event + ' Key: '+msg.EventKey);
        //logger.debug(msg);
    })
    .middlewarify();

wx.use('/notjs',wxmw);

wx.post('/notjs', function(req, res) {
    res.reply(req.weixin.Content);
    logger.debug(req.weixin);
});

var eventHandlers = {};

eventHandlers['subscribe'] = function(msg, req, res, next) {
res.reply('豆壳科技（Dowcool)是一家专注于儿童安全领域的物联网产品服务商。' +
    '我们致力于为每一个家庭和孩子提供安全可靠的智慧产品、极佳的用户体验以及贴心的用户服务。');
}

eventHandlers['unsubscribe'] = function(msg, req, res, next) {
    res.reply('');
}

wx.get('/js/main', function(req, res) {
    res.render('wx/main', {});
});

wx.get('/js/cfg', function(req, res) {
    var params = {
        debug: false,
        jsApiList: [  'checkJsApi', 'onMenuShareTimeline', 'onMenuShareAppMessage', 'onMenuShareQQ',
            'onMenuShareWeibo', 'hideMenuItems', 'chooseImage'],
        url: req.query.url
     };
    wapi.getJsConfig(params,function(err,result){
        if(err) {
            res.json({success:false, msg:''} );
        }else {
            res.json(result);
        }
    });
});

wx.get('/js/transition.html', function(req, res) {
    res.render('wx/test/transition.html', {});
});


wx.getAccessToken = function(cb) {
    if(assessToken == null) {
        isAccessRunning = true;
        refreshAccessToken(cb);
    }else {
        cb(null,assessToken);
    }
}

wx.getServerIP = function(cb) {
    //https://api.weixin.qq.com/cgi-bin/getcallbackip?access_token=ACCESS_TOKEN
    this.getAccessToken(function(err,token){
        if(err) {
            cb(err,null);
            return;
        }
        var url =  cfg.url+'getcallbackip?access_token=' + token;
        logger.debug(url);
        dc.doGet(url,null,function(err,result){
            if(err || !result) {
                logger.error(err,result);
                cb(err,null);
            }else {
                cb(null,result['ip_list']);
            }
        });
    })

}

var timer = null;
logger.debug('load wx module');
var refreshAccessToken = function(cb) {
   ///token?grant_type=client_credential&appid=APPID&secret=APPSECRET
   var url =  cfg.url+'token?grant_type=client_credential&appid='+cfg.appID+'&secret='+cfg.appSecret;
    logger.debug(url);
   dc.doGet(url,null,function(err,result){
       isAccessRunning = false;
       if(err || !result) {
            logger.error(err,result);
           if(cb) {
               cb(err,result);
           }
           return;
       }

       if(result.access_token) {
           if(result.expires_in != cfg.AccessTokenTimeout) {
               cfg.AccessTokenTimeout = result.expires_in * 1000;
               clearInterval(timer);
               timer = null;
           }
           logger.info('set Access Token', result.access_token);
           assessToken = result.access_token;
           if(timer == null) {
               timer = setInterval(refreshAccessToken.bind(this), cfg.AccessTokenTimeout);
           }
           if(cb) {
               cb(null,assessToken);
           }
       }else {
           logger.error(err,result);
           if(cb) {
               cb(err,result);
           }
           return;
       }
   });
}

//setTimeout(refreshAccessToken.bind(this), 10*1000);
//refreshAccessToken();

/*wx.get('/', function(req, res) {
    ///wx?signature=e6fc01df7ce46cb68fb82edb0952725ffd95e31e&echostr=8453086064825051773&timestamp=1428398685&nonce=447849348
    var signature = req.query.signature;
    var echostr = req.query.echostr;
    var timestamp = req.query.timestamp;
    var nonce = req.query.nonce;
    logger.debug('get wei xin request: ' + req.url);
    //res.write(true);
    //res.send(echostr);
    res.end(echostr);
});

wx.post('/', function(req, res) {
    res.end("");
    ///wx?signature=e6fc01df7ce46cb68fb82edb0952725ffd95e31e&echostr=8453086064825051773&timestamp=1428398685&nonce=447849348
    logger.debug('get wei xin request: ' + req.body);

});*/

module.exports = wx;
