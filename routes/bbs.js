
var dc = require('../dc.js')
var mng = require('../js/manager.js')
var async = require('async');
var express = require('express');
var bbs = express.Router();
var cfg = require('../config.js').ws;
var enDef = require('../js/entityDef.js');

function isBbsAdmin(req) {
    if(!dc.isLogin(req)) {
        return false;
    }
   return dc.existAttr( req.session.act.attrs, 'bbsAdmin')
}

function doUpdateTopic(req, res, keyvalues) {
    var topicId = req.query.topicId
    enDef.db.transaction().then(function (t) {
        mng.topicManager.updateTopicValue(topicId,keyvalues,true,t,function(err, topic){
            if(err) {
                t.rollback();
                res.json({success:false,msg:"fail"});
            }else {
                t.commit();
                res.json({success:true,msg:"success"});
            }
        });
    });

}

bbs.use(function timeLog(req, res, next) {
  //console.log('Time: ', Date.now());
  next();
})

bbs.get('/topic.html', function(req, res) {
    async.parallel({ topic: function(callback){
            mng.topicManager.getTopic(req.query.topicId, function(topic){
                callback(null,topic);
            });
    }, notes: function(callback) {
            mng.topicManager.queryNotes(req.query.topicId, function (err, notes) {
                callback(err, notes);
            });
        }
    },function(error,results){
        var topic = results.topic;
        var noteNum = topic.get('readNum')+1;
        topic.set('readNum',noteNum);
        //topic.set('updatedOn',Date.now());

        enDef.db.transaction()
        .then(function (t) {
            topic.save({ silent:true })
            .then(function(topic){
                    t.commit();
            }).catch(function(err){
                    t.rollback();
            })
        });
        //set the show properties
        var show = {};
        var isAdmin = isBbsAdmin(req);
        if(isAdmin || (req.session.act != null && topic.created_by == req.session.act.id)) {
            show.show = true;
            show.lockedMsg = topic.locked?"解锁":"锁定";
            show.recallMsg = topic.recall?"恢复":"撒销";
        }

        var notes = results.notes ? results.notes:[];
        dc.render('bbs/topic',req,res,
            {act:req.session.act, userInfo: req.session.userInfo, topic:topic, notes:notes
                , cxt:cfg.context, bbsAdmin:isBbsAdmin(req), show:show, scripts:dc.uijs})
        //res.render('bbs/topic', { userInfo: req.session.userInfo, topic:topic, notes:notes, bbsAdmin:isBbsAdmin(req) });
    });

})

bbs.get('/createTopic.html', function(req, res) {
    //dc.checkLogin(req,res);
    mng.topicManager.queryTopicTypes(function(tl){
        dc.render('bbs/createTopic',req,res,
            {  userInfo: req.session.userInfo, topicTypeList:tl })
        //res.render('bbs/createTopic', { userInfo: req.session.userInfo, topicTypeList:tl });
    });
})

bbs.get('/loadTopicList', function(req, res) {
    //var logger = req.app.logger;
    dc.logger.info('loadTopicList===============');
    async.parallel({
        topics: function (callback) {
            if (isBbsAdmin(req)) {
                //Admin可以看到撒消的帖子
                req.query.recall = true;
            } else {
                req.query.recall = false;
            }
            mng.topicManager.queryTopics(req.query, function (ts) {
                var topics = ts ? ts : [];
               /* topics.forEach(function (t) {
                    var d = t.createdOn;
                    t.createdOn = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
                    d = t.updatedOn;
                    t.updatedOn = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
                });*/
                callback(null, topics);
            });
        },
        totalNum: function (callback) {
            mng.topicManager.getTotalTopicNum(req.query, function (total) {
                callback(null,total);
            });
        }
    },function(error,result){
        var data = { totalNum:result.totalNum, success:true,topics:result.topics, cxt:cfg.context, bbsAdmin:isBbsAdmin(req) };
        if(req.query.json) {
           //var json = JSON.stringify(data);
            res.json(data);
        }else {
            res.render('bbs/topicList', data);
        }

    })
})

bbs.post('/doCreateTopic', function(req, res) {
    //dc.checkLogin(req,res);
    var ps = req.body;
    if(req.session.userInfo && req.session.act) {
        enDef.db.transaction().then(function(t){
            mng.topicManager.createTopic(t,req.session.act, ps.title, ps.content, ps.typeId, function(success,result){
                if(success){
                    t.commit();
                }else {
                    t.rollback();
                }
                res.json({success:success,msg:result});
            });
        })
    } else {
        res.redirect(cfg.context+"/bbs/createTopic.html");
    }
})

bbs.post('/doCreateTopicNote', function(req, res) {
    //dc.checkLogin(req,res);
    var ps = req.body;
    var doCreate = function(act) {
        mng.topicManager.createTopicNote(act, ps.content, ps.topicId, function(err,note){
            //res.setHeader("Refresh", 1);
            //res.redirect("/bbs/topic.html?topicId="+ps.topicId);
            res.end();
        });
    } ;

    if(req.session.userInfo && req.session.act) {
        doCreate(req.session.act);
    } else {
        res.redirect(cfg.context+"/bbs/createTopic.html");
    }
})

bbs.post('/createTopicType', function(req, res) {
    //dc.checkLogin(req,res);
    var ps = req.body;
    var doCreate = function(act) {
        mng.topicManager.createTopicType(act, ps.title, ps.desc,function(success,result){
            if(success) {
                dc.render('admin',req,res,
                    { userInfo: req.session.userInfo, result:result, success: success, act: req.session.act })
                //res.render('admin', { userInfo: req.session.userInfo, result:result, success: success});
            }else {
                dc.render('admin',req,res,
                    { userInfo: req.session.userInfo, result:result, success: success ,act: req.session.act})
               // res.render('admin', { userInfo: req.session.userInfo, result:result, success: success});
            }
        });
    }
    if(!req.session.act) {
        mng.accountManager.getByName(req.session.userInfo.data.userName, function(act){
            doCreate(act);
        });
    } else {
        doCreate(req.session.act);
    }
})

/**
 * 对帖回复的支持
 */
bbs.get('/noteSupport', function(req, res) {
    //dc.checkLogin(req,res);
    mng.topicManager.noteSupport(req.query.noteId, function(result){
        if(result == null) {
            res.end("success");
        } else {
            res.end("fail");
        }
    });
})

/**
* 对帖回复反对
 */
bbs.get('/noteOppose', function(req, res) {
    //dc.checkLogin(req,res);
    mng.topicManager.noteOppose(req.query.noteId, function(result){
        if(result == null) {
            res.end("success");
        }else {
            res.end("fail");
        }
    });
})

/**
 * 贴子回复的举报
 */
bbs.get('/noteAccusation', function(req, res) {
    //dc.checkLogin(req,res);
    res.end("success");
})

/**
 * 对note的回复，区别于对帖子的回复
 */
bbs.get('/noteFeedback', function(req, res) {
    //dc.checkLogin(req,res);
    res.end("success");
})

/**
举报帖子
 */
bbs.get('/topicAccusation', function(req, res) {
    //dc.checkLogin(req,res);
    var topicId = req.query.topicId;
    res.end("success");
})

/**
 *回帖
 */
bbs.get('/topicFeedback', function(req, res) {
    //dc.checkLogin(req,res);
    var topicId = req.query.topicId
    res.end("success");
})

/**
 *回帖
 */
bbs.get('/positionTopTopic', function(req, res) {
   // dc.checkLogin(req,res);
    doUpdateTopic(req,res,{ topSeq:req.query.topSeq });
})

/**
 *锁定帖子，用户不能再回复
 */
bbs.get('/lockedTopic', function(req, res) {
    dc.checkLogin(req,res);
    doUpdateTopic(req,res,{ locked:req.query.locked });
})

/**
 *撤消帖子，不再显示在贴列表中，用户不可见
 */
bbs.get('/recallTopic', function(req, res) {
    //dc.checkLogin(req,res);
    doUpdateTopic(req,res,{ recall:req.query.recall });
})



/**
 *帖子已解决，增加解决标志
 */
bbs.get('/resolveTopic', function(req, res) {
   // dc.checkLogin(req,res);
    doUpdateTopic(req,res,{ resolved:true });
})

/**
 *设置或撒消精华贴
 */
bbs.get('/essenceTopic', function(req, res) {
    // dc.checkLogin(req,res);
    doUpdateTopic(req,res,{ essence: req.query.essence });
})


/**
 *取得贴子的总页数
 */
bbs.get('/totalTopicPage', function(req, res) {
//dc.checkLogin(req,res);
    mng.topicManager.getTotalTopicPage(function(err,count){
        if(err || !count) {
            res.end({success:false,msg:'获取页数失败'});
        }else {
            res.end({ success:true,msg:'',count:count });
        }
    });
})

module.exports = bbs;