var dc = require('../dc.js')
var mng = require('../js/manager.js')
var async = require('async');
var express = require('express');
var im = express.Router();
var cfg = require('../config.js');
var enDef = require('../js/entityDef.js');
var qs = require('querystring');
var url=require('url');
var taskMng = require('../js/task.js');

var bg = require('./bgWorker.js')

bg.setIm(im);

var users = {};

var bgUsers = {};

var io = null;
var wsk = null;

im.initIm = function(ioc) {
    io = ioc;
    wsk = io.of('/wsk')
        .on('connection', function (socket) {
            im.onWskConnection(socket);
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

im.getSocket = function(loginKey) {
    return  users[loginKey].socket;
}

im._getUserData = function(actId) {
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

im.backgroundUI = function(data) {
    var ud = im._getUserData(data.actId)
    if(ud) {
        ud.background = data.flag;
    }
}

im.getSocketByActId = function(actId) {
    var userData = im._getUserData(actId);
    if(userData) {
        return userData.socket;
    }else {
        return  null;;
    }
}

im.getAct = function(actId) {
    var userData = im._getUserData(actId);
    if(userData) {
        return userData.act;
    }else {
        return  null;
    }
}

im.logout = function(loginKey) {
    var userData = null;
    userData = users[loginKey];
    //var userData = im._getUserData(actId,bgable);

    if(!userData) {
        return;
    }

    if(!users[loginKey].socket) {
        delete users[loginKey];
        return;
    }
    var socket = users[loginKey].socket;
    dc.logger.debug('logout loginKey='+loginKey+',socket Id=' + socket.id);

    im.notifyFriendLogout(loginKey);
    var channels = users[loginKey].channels;
    if(channels) {
        for(var i=0; i < channels.length; i++) {
            console.log('user leave loginKey='
            + loginKey+'actName='+users[loginKey].act.userName);
            socket.leave(channels[i]);
        }
    }

    users[loginKey]=null;
    delete users[loginKey];

}


im._forceLogoutByActId = function(actId) {
    var userData = im._getUserData(actId);
    if(!userData) {
        return true;
    }else {
        userData.socket.emit('forceLogout',{actId:actId});
        im.logout(userData.loginKey);
    }

}

im.onWskConnection = function(socket) {
    socket.on('loginIm', function (data) {
        dc.logger.debug('loginIm socketId='+socket.id);
        dc.logger.debug(data);
        im._forceLogoutByActId(data.actId);

        users[data.loginKey] ={ socket:socket,loginKey:data.loginKey
            ,actId:data.actId,bg:false  };

        enDef.Account.findOne({ where: { id: data.actId },
            include: [{model:enDef.Client, as:'client'},
                {model:enDef.Attr, as:'attrs'}] })
            .then(function(act){
                users[data.loginKey].act = act;
                im.downChannelList(data.loginKey,act);
                //socket.emit('personalMsg',{msg:'teest msgeeee'});
                im.downGroupsList(data.loginKey,act);
                im.downloadNotReadMessages(data.loginKey,act);
                //im.notifyFriendLogin(data.loginKey,act);
            });
    });

    socket.on('loginImBg', function (data) {
        dc.logger.debug('loginImBg socketId='+socket.id);
        //im._forceLogoutByActId(data.actId);
        //users[data.loginKey] ={ socket:socket,loginKey:data.loginKey,actId:data.actId,bg:true };
        enDef.Account.findOne({ where: { id: data.actId },
            include: [{model:enDef.Client, as:'client'},
                {model:enDef.Attr, as:'attrs'}] })
            .then(function(act){
                //users[data.loginKey].act = act;
              /* setInterval(function(){
                   socket.emit('bgMsg',{msg:'这是后台返回信息',title:'测试通知'});
               },50*1000);*/
            });
    });

    socket.on('logoutIm', function (data) {
        im.logout(data.loginKey);
        im.respMessage(socket,data);
        im.notifyFriendLogout(data.loginKey);
    });

    socket.on('background', function (data) {
      im.respMessage(socket,data);
      im.backgroundUI(data);
    });

    socket.on('channelMsg', function (data) {
        im.getMessageId(data.loginKey,function(err,id){
            data.mid = id;
            im.respMessage(socket,data);
            wsk.in(data.to).emit('channelMsg',data);
        })
        //var s = im.getSocket(data.loginKey);

        /*if(s) {
            s.in(data.channelNum).emit('channelMsg',data);
            s.to(data.channelNum).emit('channelMsg',data);
        }else {
            wsk.in(data.channelNum).emit('channelMsg',data);
            wsk.to(data.channelNum).emit('channelMsg',data);
        }*/
    });

    socket.on('personalMsg', function (data) {
        //var socket = im.getSocket(data.loginKey);
        //dc.logger.debug(data);
        im.getMessageId(data.loginKey,function(err,id){
            var ud = im._getUserData(data.to)
            //var socket = im.getSocketByActId(data.to);
            data.mid = id;
            var sendDate = data.sendDate = new Date();
            im.respMessage(socket,data);
            if( ud && !ud.background ) {
                //socket.emit('personalMsg',{msg:'teest msgeeee'});
                ud.socket.emit('personalMsg',data);
            } else {
                if(!bg.personalMsg(data)) {
                    dc.logger.debug("user not online, actId=" + data.to);
                    var act = im.getAct(data.fromActId);
                    if(act) {
                        data.sendDate = sendDate;
                        mng.imManager.saveMessage(act,data,true);
                    }
                }
            }
        })
    });

    socket.on('readMessages', function(data){
        var ud = users[data.loginKey];
        var mids = data.mids;
        if(mids && mids.length > 0) {
            mng.imManager.readMessages(ud.act,mids,function(err,count){
                ud.socket.emit('readMessages',{success:true,count:count});
            });
        } else {
            ud.socket.emit('readMessages',{success:false,msg:'no data to update',count:0});
        }
    });

    //socket.emit('news', { hello: 'world' });
    socket.on('disconnect', function(s){
        console.log('user disconnected');
        if(users[s.loginKey]) {
            im.logout(s.loginKey);
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
                    var toSocket = im.getSocketByActId(account.id);
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
            var toSocket = im.getSocketByActId(s.to);
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
}

var messageIds = [];
im.getMessageId = function(loginKey,cb) {
    var id = messageIds.pop();
    if(id) {
        cb(null,id);
    }else {
        dc.getId(loginKey, 'com.gy.im.models.Message', 10, function(ids){
            messageIds=ids;
            cb(null,messageIds.pop());
        })
    }
}

im.respMessage = function(socket,msg) {
    if(!msg._localId) {
        return;
    }
    msg.sendDate = msg.sendDate.format('yyyy-MM-dd hh:mm:ss.S');
    socket.emit('msgResp',{ _localId:msg._localId, mid:msg.mid, success:true });
}

im.downChannelList = function(loginKey) {
    var ud = users[loginKey];
    if(!ud) {
        dc.logger.error('loginKey='+loginKey+'invalid');
        return;
    }

    im.getChannel(ud.act,function(err,channels){
        if(err) {
            dc.logger.error(err);
            return;
        }
        if(!channels || channels.length < 1) {
            dc.logger.error("channel not found");
            return;
        }
        var channelData = [];
        var channelNums = [];
        for(var i = 0; i< channels.length; i++) {
            channelNums.push(channels[i].get('channelNum'))
        }
        im.joinChannels(ud.act,channelNums,loginKey,function(err,data){
            if(err) {
                dc.logger.error(err);
            }else {
                ud.socket.emit('channelList',channels);
            }
        });
    })

}

im.downGroupsList = function(loginKey) {
    var ud = users[loginKey];
    if(!ud) {
        dc.logger.error('loginKey='+loginKey+'invalid');
        return;
    }
    mng.imManager.myGroups(ud.act, function(err,groups){
        if(err) {
            return;
        }
        if(!groups || groups.length < 1) {
            return;
        }
        ud.socket.emit('groupList',groups);
    });
}

im.downloadNotReadMessages = function(loginKey) {
    var ud = users[loginKey];
    if(!ud) {
        dc.logger.error('loginKey='+loginKey+'invalid');
        return;
    }
    mng.imManager.getNotReadMessages(ud.act, function(err,messages){
        if(err) {
            return;
        }
        if(!messages || messages.length < 1) {
            return;
        }

        var mpools = [];
        for(var index = 0; index < messages.length; index++) {
            mpools.push(JSON.parse(messages[index].content));
        }

        ud.socket.emit('cacheMessages',mpools);
    });
}

im.notifyFriendLogin = function(loginKey) {

}

im.notifyFriendLogout = function(loginKey) {

}

im.joinChannels = function(act,channels,loginKey,cb) {
    if(!channels || channels.length<1) {
        cb(null,null);
        return;
    }
    if(!loginKey) {
        cb('未登录',null);
        return;
    }
    if(!users[loginKey]) {
        cb('未登录',null);
        return;
    }

    async.waterfall([
        function(cb){
            var socket = users[loginKey].socket;
            if(!socket) {
                cb('你还未登入聊天中心',null);
            }else {
                if(!users[loginKey].act) {
                    users[loginKey].act = act;
                }
                if(!users[loginKey].channels) {
                    users[loginKey].channels = [];
                }else {
                    users[loginKey].channels.push(channels)
                }
                for(var i = 0; i < channels.length; i++) {
                    socket.join(channels[i]);
                }
                cb(null,loginKey);
        }
    }], function(err, subData){
        if(err) {
            cb(err,null);
        }else {
            cb(null,subData);
        }
    })
}

im.leaveChannels = function(act,channelNum,loginKey,cb) {
    if(!channelNum) {
        cb(null,null);
        return;
    }
    if(!loginKey) {
        cb('未登录',null);
        return;
    }

    if(!users[loginKey]) {
        cb('未登录',null);
        return;
    }

    async.waterfall([
        function(cb){
            var socket = users[loginKey].socket;
            if(!socket) {
                cb('你还未登入聊天中心',null);
            }else {
                if(users[loginKey].channels) {
                    var index = null;
                    for(var key in users[loginKey].channels) {
                        if(users[loginKey].channels[key] == channelNum) {
                            index = loginKey;
                            break;
                        }
                    }
                    if(index) {
                        users[loginKey].channels.splice(index,1);
                    }
                }
                socket.leave(channelNum);
                cb(null,loginKey);
            }
        }], function(err, subData){
        cb(err,subData);
    })
}

//终端主动加入聊天室
im.post('/activeChannel', function(req, res) {
    var act = req.session.act;
    var ps = req.body;
    async.waterfall([
    function(cb){
        enDef.db.transaction().then(function (t) {
            cb(null,{t:t});
        });
    },
    function(subData,cb){
        enDef.Channel.findOne({
            where: { channelNum:ps.channelNum },
            include:[{model:enDef.Account, as:'user'}]
        }).then(function(channel) {
            if(!channel) {
                cb('频道不存在',subData);
            }else {
                subData.channel = channel;
                cb(null,subData);
            }
        }).catch(function (error) {
            cb(error, subData);
        });
    }
    ,function(subData,cb) {
        var channel = subData.channel;
        channel.addUser(act);
        channel.save({ silent:true,transaction:subData.t })
            .then(function(channel){
                cb(null,subData);
            })
            .catch(function(err){
                cb(err,subData);
            });
    },
    function(subData,cb){
        im.joinChannels(act,[ps.channelNum],req.get('loginKey'),function(err,data){
            cb(err,subData);
        })
    }
    ],
    function(err, subData){
        if(err) {
            subData.t.rollback();
            res.json({success:false,msg:'未指定要增加的好友信息'});
        } else {
            subData.t.commit();
            res.json({success:true,msg:'',channel:subData.channel});
        }
    });

});

im.post('/addFriend', function(req, res) {
    var act = req.session.act;
    var ps = req.body;
    if(!ps.friendId){
        res.json({success:false,msg:'未指定要增加的好友信息'});
        return;
    }
    async.waterfall([
        function(cb){
            enDef.db.transaction().then(function (t) {
                cb(null,{t:t});
            });
        },
        function(subData,cb){
            var groupId = ps.groupdId;
            if(!groupId) {
                enDef.Group.findOne({ where: { owner_id: act.id,name:'defGroup' },
                    include: [{model:enDef.Client, as:'client'}] })
                    .then(function(grp){
                        subData.group = grp;
                        cb(null,subData);
                    })
            }else {
                enDef.Group.findOne({ where: { id: groupId },
                    include: [{model:enDef.Client, as:'client'}] })
                    .then(function(grp){
                        subData.group = grp;
                        cb(null,subData);
                    })
            }
    }
    ,function(subData,cb){
          mng.accountManager.getById(ps.friendId,function(fact){
             if(!fact) {
                 cb('要增加的好友不存在',subData);
             } else {
                 subData.friend = fact;
                 cb(null,subData);
             }
          });
    }
    ,function(subData,cb){
        subData.group.addFriend(subData.friend);
        subData.group.save({ silent:true,transaction:subData.t })
            .then(function(group){
                cb(null,subData);
            })
            .catch(function(err){
                cb(err,subData);
            });
        //subData.group.get('friends').add(subData.friend);
    }
    ,function(subData,cb){
        enDef.Group.findOne({ where: { owner_id: subData.friend.id,name:'defGroup' },
            include: [{model:enDef.Client, as:'client'}] })
            .then(function(grp){
                subData.fgroup = grp;
                cb(null,subData);
            })
    }
    ,function(subData,cb){
        subData.fgroup.addFriend(act);
        subData.fgroup.save({ silent:true,transaction:subData.t })
            .then(function(group){
                cb(null,subData);
            })
            .catch(function(err){
                cb(err,subData);
            });
        //subData.group.get('friends').add(subData.friend);
    }],
    function(err, subData){
        if(err) {
            subData.t.rollback();
            res.json({success:false,msg:'未指定要增加的好友信息'});
        } else {
            subData.t.commit();
            res.json({success:true,msg:'',friend:subData.friend
                ,groupId:subData.group.id});
        }
    });
});

im.post('/removeFriend', function(req, res) {
    var act = req.session.act;
    var ps = req.body;
    im.joinChannels(act,[ps.channelNum],req.get('loginKey'),function(err,data){
        if(err) {
            res.json({success:false,msg:'初始化聊天讨论组失败'});
        }else {
            res.json({success:true,msg:''});
        }
    })
});

im.post('/exitChannel', function(req, res) {
    var act = req.session.act;
    var ps = req.body;
    async.waterfall([
            function(cb){
                enDef.db.transaction().then(function (t) {
                    cb(null,{t:t});
                });
            },
            function(subData,cb){
                enDef.Channel.findOne({
                    where: { channelNum:ps.channelNum },
                    include:[{model:enDef.Account, as:'user'}]
                }).then(function(channel) {
                    if(!channel) {
                        cb('频道不存在',subData);
                    }else {
                        subData.channel = channel;
                        cb(null,subData);
                    }
                }).catch(function (error) {
                    cb(error, subData);
                });
            }
            ,function(subData,cb) {
                var channel = subData.channel;
                channel.removeUser(act);
                act.removeChannel(channel);
            },
            function(subData,cb){
                im.leaveChannels(act,[ps.channelNum],req.get('loginKey'),function(err,data){
                    cb(err,subData);
                })
            }
        ],
        function(err, subData){
            if(err) {
                subData.t.rollback();
                res.json({success:false,msg:'未指定要增加的好友信息'});
            } else {
                subData.t.commit();
                res.json({success:true,msg:'',channel:subData.channel.chanelNum});
            }
        });

});

//群聊信息
im.post('/channelMsg', function(req, res) {

    //var act = req.session.act;
    var data = req.body;
    async.waterfall([function(cb){
        var socket = im.getSocket(data.loginKey);
        if(!socket) {
            res.json({success:false,msg:'未登陆聊天系统'});
        }else {
            socket.in(data.channelNum).emit('personMsg',data);
            res.json({success:true,msg:'消息已经送达'});
        }
        cb(null,data);
    }], function(err, note){
        if(err) {

        }else {

        }
        return;
    });
})

//私聊信息
im.post('/personMsg', function(req, res) {

    var data = req.body;
    var socket = im.getSocket(data.to);
    if(!socket) {
        res.json({success:true,msg:'离线消息'});
    }else {
        socket.emit('personMsg',data);
        res.json({success:true,msg:'消息已经送达'});
    }

})


//下行消息，其他系统下发给终端信息
im.post('/pushMessage', function(req, res) {

    var data = req.body;
    var msgIds = data.ids;
    if(!msgIds || msgIds == '' || msgIds.length < 1) {
        res.json({success:false,msg:'消息体为空'});
        return;
    }
    
    var socket = im.getSocket(data.to);
    if(!socket) {
        res.json({success:true,msg:'离线消息'});
    }else {
        socket.emit('personMsg',data);
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
        var socket = im.getSocketByActId(task.created_by);
        socket.emit(data.typecode,data);
    })

}

//任务执行结束
im.post('/taskEnd', function(req, res) {

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


im.getChannel = function(act,cb) {
    mng.imManager.myChannel(act, function(err,channels){
        if(err) {
            cb(err,null);
        }else {
            cb(null,channels)
        }
    });
}

//获取讨论组，并进入讨论组
im.get('/myChannels', function(req, res) {
    //var logger = req.app.logger;
    dc.logger.info('listLostInfo===============');
    async.parallel({
        channels : function (cb) {
           im.getChannel(req.session.act,function(err,channels){
               var channelNums = [];
               for(var i = 0; i< channels.length; i++) {
                   channelNums.push(channels[i].get('channelNum'))
               }
               im.joinChannels(req.session.act, channelNums,function(err,data){
                   if(err) {
                       cb('初始化聊天讨论组失败',null);
                   }else {
                       cb(null,data);
                   }
               })
           });
        }
    },function(err,result){
       if(err) {
           res.json({success:false,msg:err});
       }else {
           res.json({success:true,data:result})
       }
    })
})

//获好友组
im.get('/myGroups', function(req, res) {
    //var logger = req.app.logger;
    async.parallel({
        groups : function (cb) {
            mng.imManager.myGroups(act, function(err,groups){
                if(err) {
                    cb(err,null);
                }else {
                    cb(null,groups)
                }
            });
        }
    },function(err,result){
        if(err) {
            res.json({success:false,msg:err});
        }else {
            res.json({success:true, data:result.groups });
        }
    })
})

//获好友组
im.get('/callMobile', function(req, res) {
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
            var udata = im._getUserData(act.id)
            if(!udata) {
                res.json({ success:false, msg:'用户不在线或不是系统注册用户' });
            }else {
                res.json({ success:true, actId:act.id });
            }
        }
    })
})

//加入讨论组
im.post('/joinLostInfoChannel', function(req, res) {

    var act = req.session.act;
    var ps = req.body;
    var subData = {};
    async.waterfall([
        function(cb){
            enDef.db.transaction().then(function (t) {
                subData.t = t;
                cb(null,subData);
            });
        }
    ,function(err,subData){
            im.joinChannels(req.session.act, [subData.channel],function(err,data){
                if(err) {
                    cb('初始化聊天讨论组失败',subData);
                }else {
                    cb(null,data);
                }
            })
        }]
    , function(err, subData){
        if(err) {
            subData.t.rollback();
            res.json({success:false,msg:err});
        }else {
            subData.t.commit();
            res.json({success:true,msg:'已加入频道',channel:subData.channel});
        }
        return;
    })

})




module.exports = im;