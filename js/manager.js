var dc = require('../dc.js');
var enDef = require('./entityDef.js');
var async = require('async');

var mng = {};

mng.dao = {};

/**
Client
*/

mng.dao.client = {};

mng.dao.client.getById = function(id) {
  
};

mng.dao.client.getByName = function(name) {
  
};

/**
Account
*/
mng.dao.account = {};
mng.dao.account.getById = function(id) {
  
};

mng.dao.account.getByName = function(name) {
  
};

/**
 Topic
 */

mng.dao.topicType = {};

mng.dao.topicType.getByName = function(typeName, callback) {
    enDef.TopicType.find({ where: { title: typeName } }).then(function(type) {
        callback(type);
    });
}

mng.dao.topicType.getById = function(id, callback) {
    enDef.TopicType.find({ where: { id: id } }).then(function(type) {
        callback(type);
    });
}

/**
 Topic
*/

mng.dao.topic = {};

mng.dao.topic.queryList = function(pageNum, pageSize, params) {
  
};

/**
  Task
  .build({ title: 'foo', description: 'bar', deadline: new Date() })
  .save()
  .then(function(anotherTask) {
    // you can now access the currently saved task with the variable anotherTask... nice!
  }).catch(function(error) {
    // Ooops, do some error-handling
  }) 
*/
mng.dao.topic.save = function(topic) {
 
   enDef.Topic.build(topic)
    .save()
    .then(function(anotherTask) {
   
	}).catch(function(error) {
				   
	}) 
};

/**
	// way 1
	task.title = 'a very different title now'
	task.save().then(function() {})
	
    // way 2
	task.updateAttributes({
	  title: 'a very different title now'
	}).then(function() {})
	
	task.title = 'foooo'
	task.description = 'baaaaaar'
	task.save({fields: ['title']}).then(function() {
	 // title will now be 'foooo' but description is the very same as before
	})
	 
	// The equivalent call using updateAttributes looks like this:
	task.updateAttributes({ title: 'foooo', description: 'baaaaaar'}, {fields: ['title']}).then(function() {
	 // title will now be 'foooo' but description is the very same as before
	})
*/
mng.dao.topic.update= function(topic) {
  
};

/**
 Note
 
 Person.find({ where: { name: 'john' } }).then(function(person) {
  person.name = 'jane'
  console.log(person.name) // 'jane'
 
  person.reload().then(function() {
    console.log(person.name) // 'john'
  })
 })

*/

mng.dao.note = {};

mng.dao.note.queryList= function(pageNum, pageSize, params) {
  
};

mng.dao.note.save= function(topic) {
  
};

mng.dao.note.update= function(topic) {
  
};

//client管理器
var cm = mng.clientManager = {};

cm.getByName = function(clientName, callback) {
  enDef.Client.find({ where: { name: clientName } }).then(function(client) {
    callback(client);
  });
}

//根据ID取Client
cm.getById = function(id, callback) {
  enDef.Client.find({ where: { id: id } }).then(function(client) {
    callback(client);
  });
}

//账号管理器
var am = mng.accountManager = {};
am.getByName = function(actName, callback) {
    async.waterfall([ function(cb){
        enDef.Account.findOne({ where: { userName: actName }, include: [{model:enDef.Client, as:'client'},
            {model:enDef.Attr, as:'attrs'}] })
            .then(function(act){
                cb(null,act);
             })
    }/*,function(act, cb){
        enDef.Attr.findAll({ where: { model: 'Account', belong_id:act.id } })
            .then(function(attrs){
                act.attrs = attrs;
                cb(null,act);
            })
    }*/], function(err, act){
        if(err) {
            return;
        }
        callback(act);
    })
}

am.getById = function(id, callback) {
  enDef.Account.findOne({ where: { id: id }, include: [{model:enDef.Client, as:'client'}] }).then(function(act) {
      callback(act);
  });
}

am.updateActInfo = function(req, cb){
    enDef.Account.findOne({ where: { id : req.body.actId }} )
        .then(function(account) {
            for(var key in req.body) {
                account.set(key, req.body[key]);
                //account[key] = req.act[key];
            }
            account.save({ silent:true }).then(function(account){
                req.session.act = account;
                cb(null);
            })
        });
}

am.getActByMobile = function(mobile, cb){
    enDef.Account.findOne({ where: { mobile : mobile }} )
        .then(function(account) {
            cb(null,account);
        });
}

var topicMng = mng.topicManager = {};

/**

 Model.findAll({
  where: Sequelize.and(
    { name: 'a project' },
    Sequelize.or(
      { id: [1,2,3] },
      { id: { gt: 10 } }
    )
  )
})

 * @param params
 * @param callback
 */
topicMng.queryTopics = function(params, callback) {
    //include fields
    var includes = [{model:enDef.Account, as:'createdBy'},{model:enDef.TopicType, as:'topicType'},
        {model:enDef.Account, as:'updatedBy'}];

    var whereOpts = {};

    if( params.topicTypeId && params.topicTypeId > 0 ) {
        //args.push({ topic_type : params.topicTypeId } );
        whereOpts.topic_type=params.topicTypeId;
    }

    if( params.essence ==='true') {
        //args.push({ essence : true } );
        whereOpts.essence=true;
    }

    if( !params.recall) {
        //args.push({ recall : false } );
        whereOpts.recall=false;
    }

    var lkc = null;
    if( params.searchStr) {
        lkc = enDef.Sequelize.or(
            {
                title : { like: '%' + params.searchStr + '%' }
            },
            {
                content : { like: '%' + params.searchStr + '%' }
            }
        )
    }

    whereOpts = enDef.Sequelize.and(whereOpts,lkc);

    var od = " `Topic`.`top_seq` ASC, `Topic`.`essence` ASC ";
    if(params.orderBy) {
        if('hot' === params.orderBy) {
            //最热
            od = od + " , `Topic`.`note_num` DESC"
        } else if('latest' === params.orderBy) {
            //最新
            od = od + " , `Topic`.`created_on` DESC";
        } else {
            od = od + " , `Topic`.`created_on` DESC";
        }
    }

    var offset = parseInt(params.offset);
    enDef.Topic.findAll({ include:includes,where:whereOpts, order: od,
        offset:offset, limit:9 })
        .then(function(topics) {
            callback(topics);
     });
}

topicMng.queryNotes = function(topicId, callback) {
    // Table.findAll({attributes: ['column1', sequelize.fn('count', sequelize.col('column2'))],
    // group: ["Table.column1"]}).success(function (result) { });
    enDef.Note.findAll({ where:{topic_id : topicId },include: [{model:enDef.Account, as:'createdBy'}] })
        .then(function(notes) {
            async.sortBy(notes, function(item, callback) {
                callback(null,item.seq);
            }, function(err,notes) {
                callback(null, notes);
            });
        });
}

topicMng.getNoteSeq = function(topicId, callback) {
    enDef.Note.count({ where:{topic_id: topicId } })
        .then(function(num) {
            callback(null, num+1);
        });
}

topicMng.getTopic = function(id, callback) {
    enDef.Topic.findOne({ where: { id:id }, include: [{model:enDef.Account, as:'createdBy'},{model:enDef.TopicType, as:'topicType'}] })
        .then(function(topic) {
            callback(topic);
        });
}

topicMng.getTopicHeadData = function(callback) {
    async.parallel({todayTopicNum:function(cb){

        var begin = new Date();
        begin.setMilliseconds(0);
        begin.setSeconds(0);
        begin.setMinutes(0);
        begin.setHours(8);
        begin.setDate(begin.getDate());

        var end = new Date();
        end.setMilliseconds(0);
        end.setSeconds(0);
        end.setMinutes(0);
        end.setHours(8);

        end.setDate(end.getDate()+1);

        enDef.Topic.count({where:{createdOn:{ lt:end, gt:begin }}}).then(function(count){
            cb(null,count);
        })
    },totalTopicNum:function(cb){
        enDef.Topic.count().then(function(count){
            cb(null,count);
        })
    },sortedSeq:function(cb){
        cb(null,0);
    }},function(err,results){
        if(!results) {
            results = {};
        }
        if(!results.todayTopicNum) {
            results.todayTopicNum = 0;
        }
        if(!results.totalTopicNum) {
            results.totalTopicNum = 0;
        }
        if(!results.sortedSeq) {
            results.sortedSeq = 0;
        }
        callback(err,results);
    })
}

topicMng.isFirstTopic = function(actId, callback) {
    enDef.Topic.count({ where: { updated_by:actId } })
        .then(function(count) {
            callback(null, count==0);
        });
}

 topicMng.createTopic = function(loginKey,act, title, content, typeId , callback) {
     async.parallel({topicType : function(cb){
         mng.dao.topicType.getById(typeId,function(typeObject){
             cb(null,typeObject);
         });
     },id:function(cb){
        dc.getId(loginKey, 'com.gy.bbs.Topic', 1, function(ids){
            cb(null,ids[0]);
        })
     },firstTopic:function(cb){
         topicMng.isFirstTopic(act.id, function(err, isFirst){
             cb(err,isFirst);
         })
       }
     }, function(err, results){
         if(err) {
             callback(err,null);
             return;
         }
         var topic = enDef.Topic.build({ id: results.id, title:title, content:content, client_id:act.client_id,
         updated_by:act.id, created_by:act.id,topic_type:results.topicType.id, firstTopic:results.firstTopic });
         //topic.setCreatedBy(act);
         //topic.setUpdatedBy(act);
         //topic.setClient(act.client);
        // topic.setTopicType(results[0]);
         topic.save().then(function(anotherTask) {
               callback(topic);
             }).catch(function(error){
                callback(null);
            });
     })
  }

topicMng.createTopicNote = function(loginKey,act, content,topicId, callback) {
    async.waterfall([function(cb){
        dc.getId(loginKey, 'com.gy.bbs.Note', 1, function(ids){
            cb(null,ids[0]);
        })
    },function(noteId, cb){
        topicMng.getNoteSeq(topicId, function(err, seq){
            cb(err,[noteId,seq]);
        })
    },function(data,cb){
        var note = enDef.Note.build({ id: data[0], content:content, client_id:act.client_id,
            updated_by:act.id, created_by:act.id,topic_id:topicId, seq:data[1]});
        note.save().then(function(anotherTask) {
            cb(null, note);
        }).catch(function(error){
            cb(error,null);
        });
    },function(note, cb){
        topicMng.getTopic(topicId,function(topic){
           var noteNum = topic.get('noteNum')+1;
            topic.set('noteNum',noteNum);
            topic.set('updatedOn',Date.now());
            topic.save({ silent:true }).then(function(topic){
                cb(null, note);
            })
        })
    }], function(err, note){
        if(err) {
            callback(err,null);
            return;
        }
        callback(null,note);
    })
}

topicMng.createTopicType = function(loginKey,act, title, desc, callback) {
    async.series([function(cb){
        dc.getId(loginKey, 'com.gy.bbs.TopicType', 1, function(ids){
            cb(null,ids[0]);
        })
    },function(cb){
        cm.getByName('Common', function(client){
            cb(null,client);
        })
    }], function(err, results){
        if(err) {
            callback(false,err);
            return;
        }
        var topicType = enDef.TopicType.build({ id: results[0], title:title,
            description:desc, client_id:'2', updatedBy:act, createdBy:act});
        topicType.save().then(function(anotherTask) {
                callback(true,topicType);
            }).catch(function(error){
                callback(false,error);
            });
    })
}

topicMng.queryTopicTypes = function(callback) {
    /*
    enDef.db.query('SELECT * FROM t_topic_type', enDef.TopicType).then(function(types){
        // Each record will now be a instance of Project
        callback(types);
    });
    */

    enDef.TopicType.findAll({where: {}}).then(function(topicTypes) {
        callback(topicTypes);
    });

}

topicMng.noteSupport = function(noteId,cb) {
    enDef.Note.findOne({ where: { id:noteId }} )
        .then(function(note) {
            note.set('supportNum',note.get('supportNum')+1);
            //topic.set('updatedOn',Date.now());
            note.save({ silent:true }).then(function(note){
                cb(null);
            })
        });

}

topicMng.noteOppose = function(noteId,cb) {
    enDef.Note.findOne({ where: { id:noteId }} )
        .then(function(note) {
            note.set('opposeNum',note.get('opposeNum')+1);
            //topic.set('updatedOn',Date.now());
            note.save({ silent:true }).then(function(note){
                cb(null);
            })
        });
}

topicMng.getTotalTopicNum = function(params,cb) {

    var whereOpts = {};
    if(params) {
        if(params.topicTypeId && params.topicTypeId > 0) {
            whereOpts.topic_type= params.topicTypeId
        }
        if( !params.recall ) {
            //不包含撒消帖子
            whereOpts.recall= false;
        }
    }

    enDef.Topic.count({ where:whereOpts })
        .then(function(num) {
            cb(num);
        });
}

topicMng.updateTopicValue = function(topicId, keyValues,silent,t, cb) {
    if(!topicId) {
        cb('fail', null);
        return;
    } else {
        topicMng.getTopic(topicId, function (topic) {
            for (var key in keyValues) {
                topic.set(key, keyValues[key]);
            }
            topic.save({silent: silent, transaction: t})
                .then(function (topic) {
                    cb(null, topic);
            });
        });
    }
}

var imManager = mng.imManager = {};
imManager.myChannel = function(act, cb) {
    enDef.Account.findOne({
        where: { id:act.id },
        include:[{model:enDef.Channel, as:'channel'}]
    })
    .then(function(chAct) {
         cb(null, chAct.get('channel'));
    }).catch(function (err) {
        cb(err, null);
    });
}

imManager.myGroups = function(act, cb) {
    enDef.Group.findAll({
        where: { owner_id:act.id },
        include:[{model:enDef.Account, as:'friend'}]
    })
        .then(function(grups) {
            cb(null, grups);
        }).catch(function (err) {
            cb(err, null);
        });
}

imManager.saveMessage = function(act, msg,one2one) {

    var message = enDef.Message.build({ mid: msg.mid, content:JSON.stringify(msg), client_id:act.client_id,read1:false,
        updated_by:act.id, created_by:act.id, to1:msg.to, sendDate:msg.sendDate, typecode:msg.typecode,one2one:one2one
    });
    message.save().then(function(anotherTask) {
        //cb(null, message);
        console.log();
    }).catch(function(error){
        console.log(error);
    });
}

imManager.readMessages = function(act, mids,cb) {
    if(mids && mids.length <= 0) {
        cb(null,0);
        return;
    }

    var sql = 'update t_message set read1=1 where mid in ( ';
    for(var i =0; i< mids.length ; i++) {
        sql = sql + mids[i];
        if(i < mids.length-1) {
            sql = sql + ',';
        }
    }
    sql = sql + ')';

    enDef.db.query(sql, {type: enDef.db.QueryTypes.UPDATE }
    ).then(function(count) {
            console.log(count);
            cb(null,count);
    });

}

imManager.getNotReadMessages = function(act,cb) {
    //include fields
    var pageSize = 3;
    var includes = [{model:enDef.Account, as:'updatedBy'}];
    var od = " `Message`.`send_date` ASC ";
    var attrs = ['content']
    var whereOpts = {};
    whereOpts.updated_by=act.id;
    whereOpts.read1=false;
    //whereOpts.isLost=true;
    var subData = {};
    async.waterfall([
            function(cb1){
                //qurery Message
                enDef.Message.findAll({attributes:attrs, include:includes,where:whereOpts, order: od})
                    .then(function(messages){
                        cb1(null,messages);
                    });
            }
            //在这里加并行方法
        ],
        function(err, messages){
            if(err) {
                cb(err, messages);
            }else {
                cb(null,messages);
            }
        });
}


var finderManager = mng.finderManager = {};

finderManager.queryLostInfos = function(params, callback) {
    //include fields
    var pageSize = 2;
    var includes = [{model:enDef.Account, as:'updatedBy'}];

    var od = " `LostInfo`.`lost_date` DESC ";

    var whereOpts = this.getWhereOps(params);

    if(!params.pageNum) {
        params.pageNum = 0;
    }
    var offset = parseInt(params.pageNum)*pageSize;

    var subData = {};

    async.waterfall([
            function(cb){
                //qurery lostinfo
                enDef.LostInfo.findAll({ include:includes,where:whereOpts, order: od,
                    offset:offset, limit:pageSize })
                    .then(function(infos){
                        subData.infos = infos;
                        if(infos && infos.length > 0 ) {
                            var lids = [];
                            for(var i = 0; i < infos.length; i++ ) {
                                lids.push(infos[i].id);
                            }
                            subData.lids = lids;
                        }

                        cb(null,subData);
                    });
            }
            ,function(subData,cb) {
                finderManager.getImageMatchByLostInfoIds(subData.lids,function(err,matchList){
                    subData.matchList = matchList;
                    cb(null,subData);
                })
            }
            ,function(subData,cb) {
                finderManager.getLostInfoNoteByLostInfoIds(subData.lids,function(err,lostInfoNotes){
                    subData.notes = lostInfoNotes;
                    cb(null,subData);
                })
            },
            //在这里加并行方法
        ],
        function(err, subData){
            if(err) {
                callback({infos:[], matchList:[], notes: [] });
            }else {
                callback({ infos:subData.infos, matchList:subData.matchList
                    ,notes: subData.notes});
            }
        });
}

finderManager.combineLostInfo = function (linfosPers,mlist,notes) {

    var linfos = JSON.parse(JSON.stringify(linfosPers));
    var mmap = {};

    for(var i = 0; i< mlist.length; i++) {
        if(!mmap[mlist[i].lostInfo.id]) {
            mmap[mlist[i].lostInfo.id] = [];
        }
        mmap[mlist[i].lostInfo.id].push(mlist[i]);
    }

    var noteMap = {};
    for(var i = 0; i< notes.length; i++) {
        if(!noteMap[notes[i].lostInfo.id]) {
            noteMap[notes[i].lostInfo.id] = [];
        }
        notes[i].createdUserName = notes[i].createdBy.nickName;
        noteMap[notes[i].lostInfo.id].push(notes[i]);
    }

    for(var j=0; j< linfos.length;j++){
        linfos[j].matchList = mmap[linfos[j].id];
    }

    for(var j=0; j< linfos.length;j++){
        linfos[j].notes = noteMap[linfos[j].id]?noteMap[linfos[j].id]:[];
    }

    return linfos;
}

finderManager.queryPresentInfos = function(params, callback) {
    //include fields
    var pageSize = 3;
    var includes = [{model:enDef.Account, as:'updatedBy'}];

    var od = " `LostInfo`.`name` DESC ";

    var whereOpts = {};

    whereOpts.updated_by=params.actId;
    //whereOpts.isLost=true;

    var subData = {};

    async.waterfall([
            function(cb){
                //qurery lostinfo
                enDef.LostInfo.findAll({ include:includes,where:whereOpts, order: od})
                    .then(function(infos){
                        subData.infos = infos;
                        cb(null,subData);
                    });
            }
            //在这里加并行方法
        ],
        function(err, subData){
            if(err) {
                callback(err, {infos:[]} );
            }else {
                callback(null,{ infos:subData.infos});
            }
        });
}

finderManager.getLostInfoByIds = function(ids,cb) {
    var includes = [{model:enDef.Account, as:'updatedBy'}];
    var od = " `LostInfo`.`lost_date` DESC ";
    if(!ids || ids.length < 1 ) {
        cb(null,[]);
    }else {
        enDef.LostInfo.findAll({
            include:includes
            , where:{id:{ $in:ids } }
            , order:od })
            .then(function(lostInfos) {
                cb(null,lostInfos);
            });
    }
}

finderManager.getImageMatchByLostInfoIds = function(ids,cb) {
    if(!ids || ids.length < 1 ) {
        cb(null,[]);
    }else {
        enDef.ImageMatch.findAll({
            include:[
                { model: enDef.CollectLostInfo, as:'collectLostInfo'}
                ,{ model: enDef.LostInfo, as:'lostInfo'}]
            , where:{lost_info_id:{ $in:ids },similarity:{$gt:75}  }
            , order: " `ImageMatch`.`similarity` DESC " })
            .then(function(matchList) {
                cb(null,matchList);
            });
    }

}

finderManager.getLostInfoNoteByLostInfoIds = function(ids,cb) {
    if(!ids || ids.length < 1 ) {
        cb(null,[]);
    }else {
        enDef.LostInfoNote.findAll({
            include:[
                { model: enDef.LostInfo, as:'lostInfo'}
                ,{ model: enDef.LostInfoNote, as:'forNote'}
                ,{ model: enDef.Account, as:'createdBy'}]
            , where:{lost_info_id:{ $in:ids }  }
            , order: " `LostInfoNote`.`seq` ASC " })
            .then(function(lostInfoNotes) {
                cb(null,lostInfoNotes);
            });
    }
}

finderManager.queryCollectLostInfos = function(params, callback) {
    //include fields
    var includes = [{model:enDef.Account, as:'createdBy'},{model:enDef.Account, as:'updatedBy'}];

    var od = " `CollectLostInfo`.`found_date` DESC";

    var whereOpts = this.getCollectWhereOps(params);

    var offset = parseInt(params.offset);
    enDef.CollectLostInfo.findAll({ include:includes,where:whereOpts, order: od,
        offset:offset, limit:100 })
        .then(function(infos) {
            callback(infos);
        });
}

finderManager.queryMyCollectLostInfos = function(params, callback) {
    //include fields
    var includes = [{model:enDef.Account, as:'createdBy'},{model:enDef.Account, as:'updatedBy'}];

    var od = " `CollectLostInfo`.`found_date` DESC";

    var whereOpts = {};
    whereOpts.created_by=params.actId;

    var lkc = null;
    if( params.searchStr ) {
        lkc = enDef.Sequelize.or(
            {
                foundAddr : { like: '%' + params.searchStr + '%' }
            },
            {
                contactName : { like: '%' + params.searchStr + '%' }
            }
        )
    }

    whereOpts = enDef.Sequelize.and(whereOpts,lkc);

    var offset = parseInt(params.offset);
    enDef.CollectLostInfo.findAll({ include:includes,where:whereOpts, order: od,
        offset:offset, limit:100 })
        .then(function(infos) {
            callback(infos);
        });
}

finderManager.getCollectWhereOps = function(params) {

    var whereOpts = {};
    //whereOpts.isClose=false;

    var lkc = null;
    if( params.searchStr ) {
        lkc = enDef.Sequelize.or(
            {
                foundAddr : { like: '%' + params.searchStr + '%' }
            },
            {
                contactName : { like: '%' + params.searchStr + '%' }
            }
        )
    }

    whereOpts = enDef.Sequelize.and(whereOpts,lkc);

    return whereOpts;
}

finderManager.getWhereOps = function(params) {

    var whereOpts = {};
    //whereOpts.isClose=false;
    whereOpts.isClose=false;
    whereOpts.isLost=true;

    if(params.lostInfoId) {
        whereOpts.id=params.lostInfoId;
        return whereOpts;
    }

    var lkc = null;
    if( params.searchStr) {
        lkc = enDef.Sequelize.or(
            {
                lostAddr : { like: '%' + params.searchStr + '%' }
            },
            {
                contactName : { like: '%' + params.searchStr + '%' }
            }
        )
    }

    whereOpts = enDef.Sequelize.and(whereOpts,lkc);

    return whereOpts;
}

finderManager.getTotalFinderLostNum = function(params,cb) {

    var whereOpts = this.getWhereOps(params);

    enDef.LostInfo.count({ where: whereOpts })
        .then(function(num) {
            cb(num);
        });
}

finderManager.getTotalFinderCollectLostNum = function(params,cb) {

    var whereOpts = this.getWhereOps(params);

    enDef.LostInfo.count({ where: whereOpts })
        .then(function(num) {
            cb(num);
        });
}


module.exports = mng;