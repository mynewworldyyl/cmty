var cfg = require('./config.js').fws;
var webCnf = require('./config.js').ws;

exports.uijs = ['/ueditor/ueditor.config.js','/ueditor/ueditor.all.min.js'];

exports._request = require('request');

//exports.logger = require('winston');

//exports._users = [];

var mng = require('./js/manager.js');

exports.HTTP_PREFIX = 'http://';

var hbWorker = function() {
    var p = this.getServerPath('rest/comm/hb');
    if(this._users.length ==0) {
        return;
    }
   // this.logger.debug("heartbeat");
    for(u in this._users) {
        this._request.get(p,  {headers:{ loginKey:this._users[u].loginKey }},
            function (error, response, body) {
                if (error || response.statusCode != 200) {
                    //logger.error(error,body);
                }
            }
        );
    }
}

//setInterval(hbWorker.bind(this), cfg.heartBeatTime);

exports.doPost = function(url,params,headers,cb) {
    this._request.post(url,
        { form: params, headers:headers },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                cb(null,parseResp(response,body));
            } else {
                cb(error,body);
            }
        }
    );
}

exports.doGet = function(url,headers,cb) {
    this._request.get(url,  {headers:headers},
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                cb(null,parseResp(response,body));
            } else {
                cb(error,body);
            }
        }
    );
}

var parseResp = function(response,body) {
    var ct = response.headers['content-type'];
    if(ct.indexOf('application/json') > -1||
        ct.indexOf('text/json') > -1 ) {
        return JSON.parse(body);
    }else {
        return body;
    }
}

exports.isLogin = function(req) {
    return false ||  req.session.act ;
}

exports.existAttr = function(attrs,key) {
    return this.getAttr(attrs,key) != null;
}

exports.getAttr = function(attrs,key) {
    if(!attrs) {
        return null;
    }
    for(var i = 0; i < attrs.length; i++) {
        var attr = attrs[i];
        if(key == attr.name) {
            return attr.value;
        }
    }
    return null;
}

exports.getLoginKey = function(req) {
    var key = req.get('loginKey');
    if(key) {
        return key;
    }
    if(req.query && req.query.loginKey) {
        return req.query.loginKey;
    }

    if(req.body && req.body.loginKey) {
        return req.body.loginKey;
    }
    return null;
}

exports.doLogin = function(un,pwd,cid) {
    var dc = this;
    var self = this;
    dc._request.post(dc.getServerPath('rest/user/login'),
        { form: {userName:params.userName, pwd:params.pwd, cid:params.cid} },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var result = JSON.parse(body);
                if(result.success) {
                    req.session.userInfo = result;
                    //dc.logger.info('Login success: ', result.data.userName);
                    self.getAcountByName(result.data.userName,function(act){
                        //req.session.userName = act.getUserName()
                       // dc._users.push(act);
                        req.session.act = act;
                        //resp.redirect("/");
                    });
                } else {
                    dc.render('uc/login', req, resp, { userInfo: result , cxt:cfg.context });
                }
                //dc.logger.info(body)
            } else {
                dc.render('uc/login',req,resp,  { userInfo: { success:false, msg:"登陆失败"} , cxt:cfg.context });
            }
        }
    );
}
var enDef = require('./js/entityDef.js');
exports.getAcountByName = function(actName,cb) {
    enDef.Account.findOne({ where: { userName: actName }, include: [{model:enDef.Client, as:'client'},
        {model:enDef.Attr, as:'attrs'}] })
        .then(function(act){
            cb(null,act);
     })
}

exports.getServerPath = function(path) {
  var p = this.HTTP_PREFIX + cfg.serverIP + ":" + cfg.port + cfg.context;
  if(path) {
    p = p + path;
  }
  return p;
}

//http://localhost:9999/dc/rest/id/numberId?entityId=com.hy.bbs.TopicType&clientId=0&idNum=1
exports.getId = function(loginKey, entityId,idNum,cb) {
    var p = this.getServerPath('rest/id/numberId?entityId='+entityId + '&clientId=0&idNum='+idNum);
    this._request.get(p,  {headers:{loginKey:loginKey}},
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var result = JSON.parse(body);
                cb(result);
            } else {
               throw 'getId error: ' + body ;
            }
        }
    );
    return p;
}

exports.trans =  function(cb){
    enDef.db.transaction().then(function (t) {
        cb(null,{t:t});
    });
},

exports.getStringId = function(loginKey, entityId,idNum,idLen,idPrefix,cb) {
    var p = this.getServerPath('rest/id/stringId?entityId='+entityId
    + '&clientId=0&idNum='+idNum+'&idLen=' + idLen +'&idPrefix='+ idPrefix);
    this._request.get(p,  {headers:{loginKey:loginKey}},
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var result = JSON.parse(body);
                cb(result);
            } else {
                throw 'getId error: ' + body ;
            }
        }
    );
    return p;
}

exports.render = function(path,req,res,params) {
    if(!params) {
        params = {};
    }
    params.header = req.headerData;
    params.cxt = webCnf.context;
    res.render(path,params);
}

exports.checkLogin = function(req,res,cb) {
    var self = this;

    var un = this.getLoginKey(req);
    if(!un) {
        cb('账户未登录,或登录信息已过期，或账号在其他地方登录，请重新登录',null);
        return;
    }

    //var pwd = req.get('password');
    //var cid = req.get('cid');
    var dc = this;
    if(un && un != 'undefined' ) {
        dc._request.post(dc.getServerPath('rest/user/isLogin'),
            { form: {loginKey:un},headers:{loginKey:un} },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var result = JSON.parse(body);
                    if(result.success) {
                        if(!req.session.act) {
                            self.getAcountByName(result.data,function(err,act){
                                if(err) {
                                    cb(err,null);
                                }else {
                                    //req.session.loginKey = result.loginKey;
                                    //act.loginKey = result.loginKey;
                                    req.session.act = act;
                                    cb(null,result);
                                }
                            });
                        }else {
                            cb(null,result);
                        }
                    } else {
                        cb(result.msg,null);
                    }
                    //dc.logger.info(body)
                } else {
                    cb('服务器繁忙,请稍后再试',null);
                }
            }
        );
        return false;
    }else {
        return false;
    }

}

var log4js = require('log4js');
log4js.configure({
    appenders: [
        { type: 'console' }, //控制台输出
        {
            type: 'file', //文件输出
            filename: require('./config.js').logDir+'/access.log',
            maxLogSize: 1024,
            backups:3,
            category: 'normal'
        }
    ],
    replaceConsole: true
});

var logger = log4js.getLogger('normal');
logger.setLevel('DEBUG');

exports.log4js = log4js;
exports.logger = logger;
