var dc = require('../dc.js')
var mng = require('../js/manager.js')
var async = require('async');
var express = require('express');
var bg = express.Router();
var cfg = require('../config.js');
var enDef = require('../js/entityDef.js');
var qs = require('querystring');
var url=require('url');

var users = {};

var io = null;
var wsk = null;
var im = null;

bg.setIm = function(im0) {
    im = im0;
}

bg.initWorker = function(ioc) {
    io = ioc;
    wsk = io.of('/bg')
        .on('connection', function (socket) {
            bg.onWskConnection(socket);
    });
}

/*
io.configure('development', function(){
 setting();
 //debug
 io.set('log level', 3);

 });

 io.configure('release', function(){
 setting();
 //debug
 io.set('log level', 1);
 });
 */

bg.getSocket = function(loginKey) {
    return  users[loginKey].socket;
}

bg._getUserData = function(actId) {
    var userData = null;
    var actId = parseInt(actId);
    for(var key in users) {
        if(!users[key]) {
            continue;
        }
        var id = users[key].actId;
        if(id == actId) {
            userData = users[key];
            break;
        }
    }
    return  userData;
}

bg.getSocketByActId = function(actId) {
    var userData = bg._getUserData(actId);
    if(userData) {
        return userData.socket;
    }
    return  null;
}

bg.logout = function(loginKey) {
    var userData = null;
    userData = users[loginKey];
    //var userData = bg._getUserData(actId,bgable);

    if(!userData) {
        return;
    }

    if(!users[loginKey].socket) {
        delete users[loginKey];
        return;
    }
    var socket = users[loginKey].socket;
    dc.logger.debug('logout loginKey='+loginKey+',socket Id=' + socket.id);

    users[loginKey]=null;
    delete users[loginKey];

}


bg._forceLogoutByActId = function(actId) {
    var userData = bg._getUserData(actId);
    if(!userData) {
        return true;
    }else {
        userData.socket.emit('forceLogout',{actId:actId});
        bg.logout(userData.loginKey);
    }

}

bg.onWskConnection = function(socket) {
    socket.on('login', function (data) {
        dc.logger.debug('loginIm socketId='+socket.id);
        dc.logger.debug(data);
        bg._forceLogoutByActId(data.actId);

        users[data.loginKey] ={ socket:socket,loginKey:data.loginKey
            ,actId:data.actId};

        enDef.Account.findOne({ where: { id: data.actId },
            include: [{model:enDef.Client, as:'client'},
                {model:enDef.Attr, as:'attrs'}] })
            .then(function(act){
                users[data.loginKey].act = act;
               /* setInterval(function(){
                    socket.emit('bgMsg',{msg:'这是后台返回信息',title:'测试通知'});
                },60*1000);*/
            });
    });

    socket.on('logout', function (data) {
        users[data.loginKey] = null;
        bg.logout(data.loginKey);
        //bg.notifyFriendLogout(data.loginKey);
    });

    socket.on('channelMsg', function (data) {
        wsk.in(data.to).emit('channelMsg',data);
    });

    socket.on('personalMsg', function (data) {
        var socket = bg.getSocketByActId(data.to);
        if(socket) {
            socket.emit('personalMsg',data);
        } else {
            dc.logger.debug("user not online, actId=" + data.to);
        }
    });

    //socket.emit('news', { hello: 'world' });
    socket.on('disconnect', function(s){
        console.log('user disconnected');
        if(users[s.loginKey]) {
            bg.logout(s.loginKey);
        }
    });

    socket.on('WebRTC', function(s){
        if(!users[s.loginKey]) {
           return;
        }

        if(s.type == 'invite') {
            mng.accountManager.getActByMobile(s.toMobile,function(err,account){
                if(err) {
                    s.accept=false;
                    s.reason = '你拨打的账号不存在';
                    s.type='respInvite';
                    users[s.loginKey].socket.emit('WebRTC',s);
                } else {
                    var toSocket = bg.getSocketByActId(account.id);
                    if(!toSocket) {
                        s.accept=false;
                        s.reason = '你拨打的手机已关机';
                        s.type='respInvite';
                        users[s.loginKey].socket.emit('WebRTC',s);
                    } else {
                        toSocket.emit('WebRTC',s);
                    }
                }
            });
        } else {
            var toSocket = bg.getSocketByActId(s.to);
            if(toSocket) {
                toSocket.emit('WebRTC',s);
            } else {
                s.accept=false;
                s.reason = '你拨打的手机已关机';
                s.type='respInvite';
                users[s.loginKey].socket.emit('WebRTC',s);
            }
        }
    });

    socket.on('background', function (data) {
        im.backgroundUI(data);
    });
}

//下行消息，其他系统下发给终端信息
bg.post('/pushMessage', function(req, res) {

    var data = req.body;
    var msgIds = data.ids;
    if(!msgIds || msgIds == '' || msgIds.length < 1) {
        res.json({success:false,msg:'消息体为空'});
        return;
    }
    
    var socket = bg.getSocket(data.to);
    if(!socket) {
        res.json({success:true,msg:'离线消息'});
    }else {
        socket.emit('bgMsg',data);
        res.json({success:true,msg:'消息已经送达'});
    }
})

function notifyLostInfoTaskEnd(task) {
    async.parallel({
        items : function (callback) {
            mng.finderManager.queryLostInfos({lostInfoId:task.refId}, function (ts) {
                var items = ts ? ts : [];
                callback(null, items);
            });
        }
    },function(error,result){
        if(result.items.infos.length <1) {
            return;
        }
        var linfos = mng.finderManager.combineLostInfo(result.items.infos,result.items.matchList,result.items.notes);
        var data = {success:true, items:linfos,typecode:'MatchLostInfo'};
        var socket = bg.getSocketByActId(task.created_by);
        socket.emit(data.typecode,data);
    })
}

//任务执行结束
bg.post('/taskEnd', function(req, res) {

    res.json({success:true});
    var data = req.body;
    var taskId = data.taskId;
    if(!taskId || taskId.trim() == '') {
        res.json({success:false,msg:'消息体为空'});
        return;
    }

    async.waterfall([function(cb){
        enDef.Task.findOne({where: {id : taskId } } )
            .then(function(task) {
                cb(null,task);
            });
    },function(task, cb){
        var typecode = task.typecode;
        var refId = task.refId;
        if(typecode == taskMng.Typecode.LostInfoImage) {
            notifyLostInfoTaskEnd(task);
        }else if(typecode == taskMng.Typecode.CollectLostInfoImage) {

        }
        cb(null,task);
    }], function(err, note){
        if(err) {
            dc.logger.error(err);
        }
    });

})


bg.personalMsg = function(data) {
    var socket = bg.getSocketByActId(data.to);
    if(socket) {
        //socket.emit('personalMsg',{msg:'teest msgeeee'});
        socket.emit('bgMsg',data);
        return true;
    }
    return false;
}

//获好友组
bg.get('/callMobile', function(req, res) {
    async.parallel({
        groups : function (cb) {
            if(!req.query.mobile || req.query.mobile.trim() == '') {
                cb('手机号不能为空',null);
            } else {
                mng.accountManager.getActByMobile(req.query.mobile,function(err,account){
                    cb(null,{act:account});
                });
            }
        }
    },function(err,result){
        if(err) {
            res.json({ success:false,msg:err });
        }else {
            var act = result.act;
            var udata = bg._getUserData(act.id)
            if(!udata) {
                res.json({ success:false, msg:'用户不在线或不是系统注册用户' });
            }else {
                res.json({ success:true, actId:act.id });
            }
        }
    })
})

module.exports = bg;