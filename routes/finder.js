var dc = require('../dc.js')
var mng = require('../js/manager.js')
var async = require('async');
var express = require('express');
var finder = express.Router();
var cfg = require('../config.js').ws;
var enDef = require('../js/entityDef.js');
var taskMng = require('../js/task.js');
var qs = require('querystring');
//var faceApi =  require('../js/facepp-node.js');
var url=require('url');

//var host='http://www.dowcool.com:3001';

function getLostInfo(subData,cb){
    enDef.LostInfo.findOne({ where: { id : subData.task.get('refId')}} )
        .then(function(lostInfo) {
            subData.lostInfo = lostInfo;
            cb(null,subData);
        });
}

function getInfo(subData) {
    if(subData.lostInfo) {
       return subData.lostInfo;
    }else if(subData.collectLostInfo) {
       return subData.collectLostInfo;
    }
}
/**
 * 取得账号
 * @param subData
 * @param cb
 */
function getAccount(subData,cb){

    var info = getInfo(subData);
    if(!info) {
        cb('subData LostInfo not found!',subData);
        return ;
    }

    var actId = info.updated_by;
    enDef.Account.findOne({ where: { id : actId}} )
        .then(function(act) {
            subData.act = act;
            cb(null,subData);
        });
}

/**
 * 提交一个图片到第三方服务器并获得结果
 * @param subData
 * @param cb
 */
function submitImage(subData,cb){
    var info = getInfo(subData);
     subData.url = info.images.split(',')[0];
    //subData.url = '/bbs/file/download?fileId=5555ef992e1bc4a41be7bbd4';
    subData.fileId = url.parse(subData.url,true).query.fileId;

    faceApi.detDetect(host + subData.url, function(err,result){
        if(err) {
            cb(err,result);
        } else {
            subData.result = result;
            cb(null,subData);
        }
    },false,'oneface');//同步处理，并且仅检测图片中最大的一张脸
}

/**
 * 查找ImageData
 * @param subData
 * @param cb
 */
function updateImageData(subData,cb) {
    var info = getInfo(subData);
    if(!info) {
        cb('无法取得ImageData源',subData);
    }else {
        //根据图片所属人或信息获取图片实体信息
        enDef.ImageData.findOne({ where: { ref_id : info.id } } )
            .then(function(imageData) {
                subData.imageData = imageData;
                var rst = subData.result;
                imageData.set('sessionId',rst.session_id);
                imageData.set('faceCount',rst.face.length);
                imageData.set('gotResultOn',new Date());
                imageData.set('timeout',72);
                imageData.set('thirdImgId',rst.img_id);
                imageData.set('imgWidth',rst.img_width);
                imageData.set('imgHeight',rst.img_height);
                imageData.set('result',JSON.stringify(rst));
                imageData.save({ silent:true }).then(function(note){
                    cb(null,subData);
                })
            });
    }
}

function getImageData(subData,cb) {
    var info = getInfo(subData);
    if(!info) {
        cb('无法取得ImageData源',subData);
    }else {
        //根据图片所属人或信息获取图片实体信息
        enDef.ImageData.findOne({ where: { ref_id : info.id } } )
            .then(function(imageData) {
                subData.imageData = imageData;
                cb(null,subData);
            });
    }
}

/**
 * 获取人脸IDs
 * @param subData
 * @param cb
 */
function createFaces(subData,cb) {
    var rst = subData.result;
    var imd = subData.imageData;
    if(!rst.face || rst.face.length < 1) {
        cb('图片无人脸数据',subData);
    } else {
        dc.getId(loginKey, 'com.gy.finder.entity.Face', rst.face.length, function(ids){
            subData.faceIds = ids;
            var rst = subData.result;
            var imd = subData.imageData;
            var ids = subData.faceIds;
            subData.thirdFaceIds = [];
            var i = 0;
            var count = 0;
            for(; i < rst.face.length; i++) {
                var f = rst.face[i];
                subData.thirdFaceIds.push(f.face_id);
                var task = enDef.Face.build({
                    id: ids[i], client_id:imd.client_id, updated_by:imd.updated_by,
                    created_by:imd.created_by, image_id:imd.id, ownerMod:subData.ownerMod,
                    faceId:f.face_id, faceJson:JSON.stringify(f)
                });
                task.save().then(function(anotherTask) {
                    count++;
                    if(count === rst.face.length) {
                        cb(null,subData);
                    }
                }).catch(function(error){
                    console.error(error);
                    cb(error,subData);
                });
            }
        })
    }
}

/**
 * 创建并返回第3方返回persionId
 * @param subData
 * @param cb
 */
function createPerson(subData, cb) {
    //创建person
    var faceIds = subData.thirdFaceIds.join(',');
    if(taskMng.Typecode.CollectLostInfoImage === subData.task.get('typecode')) {
        var act = subData.act;
        if(act.personId && act.personId !== '') {
            faceApi.perAddFace(act.personId,faceIds,function(err,result){
                if(err) {
                    cb(err,subData);
                } else {
                    act.set('personId',result.person_id);
                    act.save({ silent:true }).then(function(info){
                        cb(null,subData);
                    });
                }
            });
        }else {
            faceApi.perCreate(faceIds,function(err,result){
                if(err) {
                    cb(err,subData);
                } else {
                    act.set('personId',result.person_id);
                    act.save({ silent:true }).then(function(info){
                        cb(null,subData);
                    });
                }
            });
        }
    }else {
        faceApi.perCreate(faceIds,function(err,result){
            if(err) {
                cb(err,subData);
            } else {
                subData.lostInfo.set('personId',result.person_id);
                subData.lostInfo.save({ silent:true }).then(function(info){
                    cb(null,subData);
                });
            }
        });
    }

}

/**
 * 更新任务状态
 * @param err
 * @param subData
 */
function endTask(err,subData1){

    subData1.callback(err,subData1);;

    if(err) {
        console.log(err);
    } else {
        //提交一个触发搜索系统图片数据库
        if(taskMng.Typecode.CollectLostInfoImage === subData1.task.get('typecode')) {
            taskMng.submitTask(subData1.act, taskMng.Typecode.CollectLostInfoImageCompare,
                subData1.collectLostInfo.id, null,
                function(err,d){
                    if(err) {
                        console.log(err);
                        console.log(d);
                    }
                }
            );
        }else if(taskMng.Typecode.LostInfoImage === subData1.task.get('typecode')) {
            taskMng.submitTask(subData1.act, taskMng.Typecode.LostInfoImageCompare,
                subData1.lostInfo.id,null,
                function(err,d){
                    if(err) {
                        console.log(err);
                        console.log(d);
                    }
                }
            );
        }
    }
}

function getCollectLostInfo(subData,cb){
    enDef.CollectLostInfo.findOne({ where: { id : subData.task.get('refId')}} )
        .then(function(lostInfo) {
            subData.collectLostInfo = lostInfo;
            console.log(JSON.stringify(lostInfo));
            cb(null,subData);
        });
}

function getSrcFace(subData,cb){

    var includes = [{model:enDef.Account, as:'createdBy'},
        {model:enDef.Account, as:'updatedBy'}];
    var od = " `Face`.`created_on` DESC ";
    //假设每张图片仅一张脸，如果图片中有多张验，仅取图片中最大的脸
    var whereOpts = { image_id: subData.imageData.id/*,
        owner_mod:taskMng.Typecode.LostInfoImage */};
    enDef.Face.findAll({ include:includes, where:whereOpts, order: od })
        .then(function(faces) {
            subData.srcFace = faces[0];
            cb(null,subData);
    });
}

function getDestFaces(subData,cb){

    var includes = [
         {model:enDef.Account, as:'createdBy'}
        ,{model:enDef.Account, as:'updatedBy'}
        ,{model:enDef.ImageData, as:'imageData'}];
    var od = " `Face`.`created_on` DESC ";

    var whereOpts = null;

    //http://sequelize.readthedocs.org/en/latest/docs/models-usage/
    var info = getInfo(subData);
    if(info.lostDate) {
        //丢失人一方为源，与发现者方为目前，createdOn代表发现时间，发现时间应该大于或等于丢失时间
        whereOpts = enDef.Sequelize.and(
            /*{ createdOn : { $gte: info.lostDate } },*/
            { owner_mod : subData.destOwnerMod }
        );
    }else {
        //从发现者一方开始为源头，丢失者为目前，createdOn代表丢失时间，发现时间应该大于丢失时间
        whereOpts = enDef.Sequelize.and(
           /* { createdOn : { $lte:info.foundDate } },*/
            { owner_mod : subData.destOwnerMod }
        );
    }


    enDef.Face.findAll({ include:includes, where:whereOpts, order: od })
        .then(function(faces) {
            subData.destFaces = faces;
            cb(null,subData);
        });
}


function handler( task,callback ){

    if(!task || !task.refId) {
        console.log('Task is null');
        return;
    }

    var subData = {};
    subData.task = task;
    subData.callback = callback;

    var methods = [];
    methods.push(function(cb) {
        if(taskMng.Typecode.CollectLostInfoImage === task.get('typecode')) {
            subData.ownerMod = taskMng.Typecode.CollectLostInfoImage;
            subData.destOwnerMod = taskMng.Typecode.LostInfoImage;
            getCollectLostInfo(subData,cb);
        }else if(taskMng.Typecode.LostInfoImage === task.get('typecode')) {
            subData.ownerMod = taskMng.Typecode.LostInfoImage;
            subData.destOwnerMod = taskMng.Typecode.CollectLostInfoImage;
            getLostInfo(subData,cb);
        }
    });

    methods.push(getAccount, submitImage, updateImageData, createFaces, createPerson);

    async.waterfall(methods, endTask);
}


taskMng.registHandler(taskMng.Typecode.LostInfoImage,handler);
taskMng.registHandler(taskMng.Typecode.CollectLostInfoImage,handler);


taskMng.registHandler(taskMng.Typecode.LostInfoImageCompare,function(task,callback){

    if(!task || !task.refId) {
        console.log('Task is null');
        return;
    }

    var subData = {};
    subData.task = task;
    subData.callback = callback;
    subData.ownerMod = taskMng.Typecode.LostInfoImage;
    subData.destOwnerMod = taskMng.Typecode.CollectLostInfoImage;

    async.waterfall([
            function(cb){
               getLostInfo(subData,cb);
            },
            getAccount,
            getImageData,
            getSrcFace,
            getDestFaces,
            function(subData,cb) {
                if(subData.destFaces.length <= 0) {
                    cb('无数据查询',subData);
                    return;
                }
                dc.getId(loginKey, 'com.gy.finder.entity.ImageMatch',
                    subData.destFaces.length,
                    function(ids){
                        subData.imageMatchIds =ids
                        cb(null,subData);
                });
            },
            //脸部比较，并取得结果
            function(subData,cb) {
                var ids = subData.imageMatchIds;
                var destFaces = subData.destFaces;
                var srcFace = subData.srcFace;
                var resultCount = 0;

                var saveMatchs = function(){
                    faceApi.recCompare(srcFace.faceId, destFaces[resultCount].faceId,
                        function(err,result){
                            var destFace = destFaces[resultCount];
                            var rst = result;
                            var imageMatch = enDef.ImageMatch.build({
                                id: ids[resultCount], client_id:subData.act.client_id, updated_by:subData.act.id,
                                created_by:subData.act.id, coll_li_id:destFace.imageData.get('refId'),
                                lost_info_id:subData.imageData.get('refId'), srcFaceId:srcFace.id,
                                destFaceId:destFace.id, result:JSON.stringify(rst),
                                month:rst.month, eyebrow:rst.eyebrow, eye:rst.eye, nose:rst.nose,
                                similarity:rst.similarity,owner_mod:taskMng.Typecode.LostInfoImage
                                ,refId:task.get('refId'),imageUrl:destFace.imageData.imageUrl
                            });
                            imageMatch.save().then(function() {
                                resultCount++;
                                if(resultCount === destFaces.length) {
                                    cb(null,subData);
                                }else {
                                    setTimeout(saveMatchs, 1);
                                }
                            }).catch(function(error){
                                console.error(error);
                                cb(error,null);
                                return;
                            });
                        });
                }

                if(destFaces.length < 1){
                    cb(null,subData);
                } else {
                    setTimeout(saveMatchs, 1);
                }
            },

        ],
        function(err,subData){
            //更新任务数据，结果此次任务
            callback(err,subData);
        }
    );

});


taskMng.registHandler(taskMng.Typecode.CollectLostInfoImageCompare,function(task,callback){

    if(!task || !task.refId) {
        console.log('Task is null');
        return;
    }

    var subData = {};
    subData.task = task;
    subData.callback = callback;
    subData.ownerMod = taskMng.Typecode.CollectLostInfoImage;
    subData.destOwnerMod = taskMng.Typecode.LostInfoImage;

    async.waterfall([
            function(cb){
                getCollectLostInfo(subData,cb);
            },
            getAccount,
            getImageData,
            getSrcFace,
            getDestFaces,
            //脸部比较，并取得结果
            function(subData,cb) {
                var destFaces = subData.destFaces;
                var srcFace = subData.srcFace;
                var matchRst = {};
                subData.matchRst = matchRst;
                var count = 0;
                for(var i = 0; i< destFaces.length; i++) {
                    faceApi.recCompare(srcFace.faceId,destFaces[i].faceId,
                        function(err,result){
                            matchRst[destFaces[count].faceId] = result;
                            count++;
                            if(count === destFaces.length) {
                                cb(null,subData);
                            }
                        });
                }
            },
            function(subData,cb) {
                dc.getId(loginKey, 'com.gy.finder.entity.ImageMatch',
                    subData.destFaces.length,
                    function(ids){
                        subData.imgMatchIds = ids;
                        cb(null,subData);
                    });
            },
            function(subData,cb) {
                var destFaces = subData.destFaces;
                var srcFace = subData.srcFace;
                subData.imageMatchs = [];
                var matchRst = subData.matchRst;
                var ids = subData.imgMatchIds;
                var count=0;
                for(var i = 0; i < destFaces.length; i++ ) {
                    var destFace = destFaces[i];
                    var rst = matchRst[destFace.faceId];
                    if(!rst) {
                        continue;
                    }

                    var imageMatch = enDef.ImageMatch.build({
                        id: ids[i], client_id:subData.act.client_id, updated_by:subData.act.id,
                        created_by:subData.act.id, coll_li_id:subData.imageData.refId,
                        lost_info_id:destFace.imageData.refId, srcFaceId:srcFace.id,
                        destFaceId:destFace.id, result:JSON.stringify(rst),
                        month:rst.component_similarity.month, eyebrow:rst.component_similarity.eyebrow,
                        eye:rst.component_similarity.eye, nose:rst.component_similarity.nose,
                        similarity:rst.similarity,ownerMod:taskMng.Typecode.CollectLostInfoImage,
                        refId:task.get('refId'),imageUrl:subData.imageData.imageUrl
                    });
                    imageMatch.save().then(function(anotherTask) {
                        count++;
                        subData.imageMatchs.push(imageMatch);
                        if(count === destFaces.length) {
                            cb(null,subData);
                        }
                    }).catch(function(error){
                        console.error(error);
                        cb(error,null);
                    });
                }

            }
        ],
        function(err,subData){
            //更新任务数据，结果此次任务
            callback(err,subData);
        }
    );

});

function isBbsAdmin(req) {
    if(!dc.isLogin(req)) {
        return false;
    }
   return dc.existAttr(req.session.act.attrs, 'bbsAdmin')
}

finder.use(function timeLog(req, res, next) {
  next();
})


finder.post('/presentInfo', function(req, res) {

    var act = req.session.act;
    if(!act) {
        res.json({success:false,msg:'未登录'});
        return;
    }
    async.waterfall([
            function(cb){
                enDef.db.transaction().then(function (t) {
                   var subData={t:t};
                    cb(null,subData);
                });
            },
            function(subData, cb){
                dc.getId(req.get('loginKey'), 'com.gy.finder.entity.LostInfo', 1, function(ids){
                    subData.lid=ids[0];
                    cb(null,subData);
                })
            },
            function(subData, cb){
                var data = req.body;
                var images = data.images;
                if(!images || images =='') {
                    cb('无选择头像文件',null);
                    return;
                }
                var linfo = enDef.LostInfo.build({
                    id: subData.lid, name:data.name, relativedName:data.relativedName,figurePrint:data.figurePrint,
                    updated_by:act.id, created_by:act.id, images:images, client_id:act.client_id
                });

                linfo.save({transaction:subData.t}).then(function(anotherTask) {
                    subData.linfo = linfo;
                    cb(null,subData);
                }).catch(function(error){
                    console.error(error);
                    cb(error,subData);
                });
            }
            //在这里加并行方法

        ],
        function(err, results){
            if(err) {
                results.t.rollback();
                console.error(err);
                var msg = null;
                if(typeof err  === 'string') {
                    msg = err;
                } else {
                    msg = '保存失败';
                }
                res.json({ success:false, msg:msg });
            } else {
                results.t.commit();
                res.json({ success:true,msg:'保存成功',data:results.linfo })
            }
        })
})

finder.post('/updatePresentInfo', function(req, res) {

    var act = req.session.act;
    if(!act) {
        res.json({success:false,msg:'未登录'});
        return;
    }
    var data = req.body;
    async.waterfall([
            function(cb){
                enDef.LostInfo.findOne({
                    where: { id:data.id }
                }).then(function(li) {
                    cb(null, {lostInfo:li});
                }).catch(function (err) {
                    cb(err, null);
                });
            },
            function(subData,cb){
                enDef.db.transaction().then(function (t) {
                    subData.t = t;
                    cb(null,subData);
                });
            },
            function(subData, cb){
                var images = data.images;
                if(!images || images=='') {
                    cb('无选择头像文件',null);
                    return;
                }
                var lostInfo = subData.lostInfo;
                lostInfo.name = data.name;
                lostInfo.relativedName=data.relativedName;
                lostInfo.figurePrint = data.figurePrint;
                lostInfo.images = images;
                lostInfo.updatedOn = new Date();
                lostInfo.updated_by = act.id;

                lostInfo.save({transaction:subData.t}).then(function(anotherTask) {
                    cb(null,subData);
                }).catch(function(error){
                    console.error(error);
                    cb(error,subData);
                });
            }
        ],
        function(err, subData){
            if(err) {
                if(subData && subData.t) {
                    subData.t.rollback();
                }
                console.error(err);
                var msg = null;
                if(typeof err  === 'string') {
                    msg = err;
                } else {
                    msg = '保存失败';
                }
                res.json({ success:false, msg:msg });
            } else {
                subData.t.commit();
                res.json({ success:true,msg:'保存成功',data:lostInfo })
            }
        })
})

finder.get('/listPresentInfo', function(req, res) {
    //var logger = req.app.logger;
    var act = req.session.act;
    req.query.actId = act.id;
    async.parallel({
        items : function (callback) {
            mng.finderManager.queryPresentInfos(req.query, function (err,ts) {
                var items = ts ? ts : [];
                callback(err, items);
            });
        }
    },function(error,result){
        var data = {success:true,items:result.items.infos};
        res.json(data);
    })
})


finder.post('/updateLostInfo', function(req, res) {

    var act = req.session.act;
    if(!act) {
        res.json({success:false,msg:'未登录'});
        return;
    }
    var data = req.body;
    async.waterfall([
        function(cb){
            enDef.LostInfo.findOne({
                where: { id:data.id }
            }).then(function(lostInfo) {
                    if(lostInfo) {
                        cb(null, {lostInfo:lostInfo});
                    }else {
                        cb('人员未登记，请先做登记',null);
                    }
                }).catch(function (err) {
                    cb(err, {});
                });
        },
        function(subData,cb){
            enDef.db.transaction().then(function (t) {
                subData.t = t;
                cb(null,subData);
            });
        },
        function(subData, cb){

            if(!data.images || data.images=='') {
                cb('无选择头像文件',null);
                return;
            }

            var lostDate = null;

            if(data.lostDate && data.lostDate !== '') {
                var dateStr = data.lostDate.split("-");
                var year = parseInt(dateStr[0], 10);
                var month = parseInt(dateStr[1], 10) - 1;
                var day = parseInt(dateStr[2], 10);
                var timeStr = data.lostTime.split(":");
                var hour = parseInt(timeStr[0], 10);
                var minute = parseInt(timeStr[1], 10) - 1;
                lostDate = new Date(year, month, day, hour, minute,0);
            }else {
                lostDate = new Date();
            }

            //var lostDate = new Date(year, month, day, hour, minute,0);
            //console.log(JSON.stringify(data));
            //lostDate = new Date(year, month, day, hour, minute,0);
            var lostInfo = subData.lostInfo;

            if(data.pos) {
                lostInfo.pos =JSON.stringify(data.pos)
                lostInfo.latitude = data.pos.latitude;
                lostInfo.longitude = data.pos.longitude;
            }

            lostInfo.name = data.name;
            lostInfo.relativedName=data.relativedName;
            lostInfo.figurePrint = data.figurePrint;
            lostInfo.images = data.images;
            lostInfo.updatedOn = new Date();
            lostInfo.updated_by = act.id;
            lostInfo.age = parseInt(data.age);
            lostInfo.height = parseInt(data.height);
            lostInfo.lostDate = data.lostDate;
            lostInfo.lostAddr = data.lostAddr;
            lostInfo.contactName = data.contactName;
            lostInfo.contactMobile1 = data.contactMobile1;
            lostInfo.contactMobile2 = data.contactMobile2;
            lostInfo.description = data.description;
            lostInfo.remark = data.remark;
            lostInfo.email = data.email;
            lostInfo.fbSum = data.fbSum ? parseFloat(data.fbSum):0;
            lostInfo.fdDesc = data.fdDesc;
            lostInfo.fpNotifyRange = parseInt(data.fpNotifyRange);
            lostInfo.hiNotifyRange = parseInt(data.hiNotifyRange);
            lostInfo.idNum = data.idNum;
            lostInfo.idPicture0 = data.idPicture0;
            lostInfo.idPicture1 = data.idPicture1;
            lostInfo.sex = data.sex;
            lostInfo.isClose = data.isClose;
            lostInfo.isLost = true;
            lostInfo.updatedOn = new Date();

            lostInfo.save({transaction:subData.t}).then(function(anotherTask) {
                cb(null,subData);
            }).catch(function(error){
                console.error(error);
                cb(error,subData);
            });
        },
        function(subData,cb){
            dc.getId(req.get('loginKey'), 'com.gy.finder.entity.ImageData', 1, function(ids){
                subData.imageDataId = ids[0];
                cb(null,subData);
            })
        },
        function(subData, cb){
            var imgUrl = subData.lostInfo.images;
            var headImg = url.parse(imgUrl,true);
            var fileId = headImg.query.fileId;
            subData.fileId = fileId;

            var imageData = enDef.ImageData.build({
                id: subData.imageDataId, client_id:act.client_id, updated_by:act.id, created_by:act.id,
                refId:subData.lostInfo.id, imageId:fileId, imageUrl:imgUrl,
                ownerMod:taskMng.Typecode.LostInfoImage
            });

            imageData.save({transaction:subData.t}).then(function(anotherTask) {
                subData.imageData = imageData;
                cb(null,subData);
            }).catch(function(error){
                console.error(error);
                cb(error,subData);
            });
        },
        function(subData,cb){
            dc.getId(req.get('loginKey'), 'com.gy.finder.entity.ImageData', 1, function(ids){
                subData.imageDataId = ids[0];
                cb(null,subData);
            })
        },
        function(subData,cb) {
            dc.getStringId(req.get('loginKey'), 'com.gy.im.models.ChannelNum', 1,8,'30',
                function(ids){
                    subData.channelNum = ids[0];
                    cb(null,subData);
            })
        }
        ,function(subData,cb){
            dc.getId(req.get('loginKey'), 'com.gy.im.models.Channel', 1, function(ids){
                var data = req.body;
                var channelName = data.name + data.lostAddr;
                if(!channelName || channelName=== '') {
                    channelName =ids[0];
                }
                var desc = data.desc;
                var channel = enDef.Channel.build({
                    id: ids[0], client_id:act.client_id, updated_by:act.id, created_by:act.id
                    , channelName:channelName, description:desc, typecode:'Public'
                    ,refId:subData.lostInfo.id, mod:taskMng.Typecode.LostInfoImage
                    ,channelNum:subData.channelNum

                });
                channel.addDeputy(act);
                channel.addUser(act);
                //act.addChannel(channel);
                channel.save({transaction:subData.t}).then(function(anotherTask) {
                    subData.channel = channel;
                    cb(null,subData);
                }).catch(function(error){
                    console.error(error);
                    cb(error,subData);
                });
            })
        }
        ,function(subData,cb) {
                subData.lostInfo.set('channelNum',subData.channel.get('channelNum'));
                subData.lostInfo.save({transaction:subData.t}).then(function(anotherTask) {
                    cb(null,subData);
                }).catch(function(error){
                    console.error(error);
                    cb(error,subData);
                });
        }
        ,function(subData,cb) {
            dc.getId(req.get('loginKey'), 'com.gy.finder.entity.Task', 1, function(ids){
                var task = enDef.Task.build({
                    id: ids[0], client_id:act.client_id, updated_by:act.id, created_by:act.id
                    , refId:subData.lostInfo.id, typecode:taskMng.Typecode.LostInfoImage
                    , imageUrl:subData.lostInfo.images
                    ,isFinish:false, readyForNext:true,remark:''
                    ,validDate:null,valid:true,ext0:'',ext1:'',ext2:''
                });
                task.save({transaction:subData.t}).then(function(anotherTask) {
                    subData.task = task;
                    cb(null,subData);
                }).catch(function(error){
                    console.error(error);
                    cb(error,subData);
                });
            })
        }
        ,function(subData,cb) {
                var p = dc.getServerPath('rest/fs/notifyTaskAdd');
                dc._request.post(p,  {headers:{loginKey:req.get('loginKey')},
                        form:{typecode:taskMng.Typecode.LostInfoImage,ids:subData.task.id}},
                    function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var result = JSON.parse(body);
                            if(result.success) {
                                cb(null,subData);
                            }else {
                                cb(result.msg,subData);
                            }
                        } else {
                            cb(error,subData);
                        }
                    }
                );
        }
    //在这里加并行方法
    ],
    function(err, subData){
        if(err) {
            if(subData.t) {
                subData.t.rollback();
            }
            console.error(err);
            var msg = null;
            if(typeof err  === 'string') {
                msg = err;
            }else {
                msg = '保存失败';
            }
            res.json({ success:false, msg:msg });
        } else {
            res.json({ success:true,msg:'保存成功',lostInfo:subData.lostInfo })
            subData.t.commit();
        }
    })
})

finder.post('/collectLostInfo', function(req, res) {
    var act = req.session.act;
    if(!act) {
        res.json({success:false,msg:'未登录'});
        return;
    }
    async.waterfall([
            function(cb){
                enDef.db.transaction().then(function (t) {
                    cb(null,{t:t});
                });
            },
            function(subData,cb){
                dc.getId(req.get('loginKey'), 'com.gy.finder.entity.CollectLostInfo', 1, function(ids){
                    subData.clInfoId=ids[0];
                    cb(null,subData);
                })
            }
            ,function(subData, cb){
                var data = req.body;
                var images = data.images;
                if(!images || images.length < 1) {
                    cb('无选择头像文件',subData);
                    return;
                }
                /*
                var foundDate = new Date();
                if(data.foundDate && data.foundDate.trim() != '') {
                    foundDate = data.foundDate;
                    var ds = foundDate.split(' ');
                    var date = ds[0].split('-');
                    var time = ds[1].split(':');

                    var foundDate = new Date(parseInt(date[0]),parseInt(date[1]),parseInt(date[2]),
                        parseInt(time[0]),parseInt(time[1]));
                }*/
                var foundDate = null;
                if(data.foundDate && data.foundDate !== '') {
                    var dateStr = data.foundDate.split("-");
                    var year = parseInt(dateStr[0], 10);
                    var month = parseInt(dateStr[1], 10) - 1;
                    var day = parseInt(dateStr[2], 10);
                    var timeStr = data.foundTime.split(":");
                    var hour = parseInt(timeStr[0], 10);
                    var minute = parseInt(timeStr[1], 10) - 1;
                    foundDate = new Date(year, month, day, hour, minute,0);
                }else {
                    foundDate = new Date();
                }

                var latitude = null;
                var longitude = null;
                var pos = null;
                if(data.pos) {
                    pos =JSON.stringify(data.pos)
                    latitude = data.pos.latitude;
                    longitude = data.pos.longitude;
                }

                if(!data.loc) {
                    data.loc='';
                }

                var linfo = enDef.CollectLostInfo.build({
                    id:subData.clInfoId, name:data.name, age:data.age, height:data.height
                    ,updated_by:act.id, created_by:act.id, foundDate:foundDate, foundAddr:data.foundAddr
                    ,figurePrint:data.figurePrint,images:images
                    ,latitude:latitude,longitude:longitude,pos:pos, loc:data.loc
                    ,contactName:data.contactName, contactMobile1:data.mobile, contactMobile2:''
                    ,description:data.desc, remark:data.remark, email:data.email,client_id:act.client_id
                });
                linfo.save({transaction:subData.t}).then(function(anotherTask) {
                    subData.collectLostInfo = linfo;
                    cb(null,subData)
                }).catch(function(error){
                    console.error(error);
                    cb('保存数据失败',subData)
                });

            }
            ,function(subData,cb){
                dc.getId(req.get('loginKey'), 'com.gy.finder.entity.ImageData', 1, function(ids){
                    subData.imageDataId = ids[0];
                    cb(null,subData);
                })
            }
            ,function(subData, cb){
                var imgUrl = subData.collectLostInfo.images.split(',')[0];
                var headImg = url.parse(imgUrl,true);
                var fileId = headImg.query.fileId;

                var imageData = enDef.ImageData.build({
                    id: subData.imageDataId, client_id:act.client_id, updated_by:act.id, created_by:act.id,
                    refId:subData.collectLostInfo.id, imageId:fileId, imageUrl:imgUrl,
                    ownerMod:taskMng.Typecode.CollectLostInfoImage
                });

                imageData.save({transaction:subData.t}).then(function(anotherTask) {
                    subData.imageData = imageData;
                    cb(null,subData);
                }).catch(function(error){
                    console.error(error);
                    cb(error,subData);
                });
            }
            ,function(subData,cb) {
                dc.getId(req.get('loginKey'), 'com.gy.finder.entity.Task', 1, function(ids){
                    var task = enDef.Task.build({
                        id: ids[0], client_id:act.client_id, updated_by:act.id, created_by:act.id
                        , refId:subData.collectLostInfo.id, typecode:taskMng.Typecode.CollectLostInfoImage
                        , imageUrl:subData.collectLostInfo.images.split(',')[0]
                        ,isFinish:false, readyForNext:true,remark:''
                        ,validDate:null,valid:true,ext0:'',ext1:'',ext2:''
                    });
                    task.save({transaction:subData.t}).then(function(anotherTask) {
                        subData.task = task;
                        cb(null,subData);
                    }).catch(function(error){
                        console.error(error);
                        cb(error,subData);
                    });
                })
            }
            ,function(subData,cb) {
                var p = dc.getServerPath('rest/fs/notifyTaskAdd');
                dc._request.post(p,  {headers:{loginKey:req.get('loginKey')}
                        ,form:{typecode:taskMng.Typecode.LostInfoImage,ids:subData.task.id}},
                    function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var result = JSON.parse(body);
                            if(result.success) {
                                cb(null,subData);
                            }else {
                                cb(result.msg,subData);
                            }
                        } else {
                            cb(error,subData);
                        }
                    }
                );
            }
            //在这里加并行方法
        ],
        function(err, subData){
            if(err) {
                if(subData.t) {
                    subData.t.rollback();
                }
                console.error(err);
                var msg = null;
                if(typeof err  === 'string') {
                    msg = err;
                }else {
                    msg = '保存失败';
                }
                res.json({ success:false, msg:msg });
                return;
            } else {
                subData.t.commit();
                res.json({ success:true,msg:'保存成功',data: subData.collectLostInfo })
            }
        });

})

finder.get('/listLostInfo', function(req, res) {
    //var logger = req.app.logger;
    dc.logger.info('listLostInfo===============');
    async.parallel({
        items : function (callback) {
            mng.finderManager.queryLostInfos(req.query, function (ts) {
                var items = ts ? ts : [];
                callback(null, items);
            });
        },
        totalNum: function (callback) {
            mng.finderManager.getTotalFinderLostNum(req.query, function (total) {
                callback(null,total);
            });
        }
    },function(error,result){
        var linfos = mng.finderManager.combineLostInfo(result.items.infos,result.items.matchList,result.items.notes);
        var data = { totalNum:result.totalNum, success:true, items:linfos, cxt:cfg.context };
        res.json(data);
    })
})


finder.get('/listCollectLostInfo', function(req, res) {
    //var logger = req.app.logger;
    //dc.logger.info('listCollectLostInfo===============');
    async.parallel({
        items : function (callback) {
            mng.finderManager.queryCollectLostInfos(req.query, function (ts) {
                var items = ts ? ts : [];
                callback(null, items);
            });
        },
        totalNum: function (callback) {
            mng.finderManager.getTotalFinderCollectLostNum(req.query, function (total) {
                callback(null,total);
            });
        }
    },function(error,result){
        var data = { totalNum:result.totalNum, success:true, items:result.items, cxt:cfg.context };
        res.json(data);
    })
})

finder.get('/listMyCollectLostInfo', function(req, res) {
    //var logger = req.app.logger;
    //dc.logger.info('listMyCollectLostInfo===============');
    var act = req.session.act;
    async.parallel({
        items : function (callback) {
            req.query.actId = act.id;
            mng.finderManager.queryMyCollectLostInfos(req.query, function (ts) {
                var items = ts ? ts : [];
                callback(null, items);
            });
        }
    },function(error,result){
        var data = {success:true, items:result.items, cxt:cfg.context };
        res.json(data);
    })
})

finder.get('/matchList', function(req, res) {

})

finder.post('/createLostInfoNote', function(req, res) {

    var act = req.session.act;
    var ps = req.body;
    async.waterfall([
     function(cb){
        enDef.db.transaction().then(function (t) {
            cb(null,{t:t});
        });
     }
    ,function(subData,cb){
        dc.getId(req.get('loginKey'), 'com.gy.finder.entity.LostInfoNote', 1, function(ids){
            subData.nodeId = ids[0];
            cb(null,subData);
        })
    }
    ,function(subData, cb){
        enDef.LostInfoNote.count({ where:{lost_info_id: ps.lostInfoId } })
            .then(function(num) {
                subData.num = num;
                cb(null,subData);
            });
    }
    ,function(subData,cb){
        var images = ps.images? ps.images.join(','):'';
        var note = enDef.LostInfoNote.build({ id:  subData.nodeId, content:ps.content,
            client_id:act.client_id, updated_by:act.id, created_by:act.id,
            lost_info_id:ps.lostInfoId, seq:subData.num, images:images});
        note.save({ silent:true, transaction:subData.t })
            .then(function(n) {
            subData.note = n;
            cb(null, subData);
        }).catch(function(error){
            cb(error,subData);
        });
    }
    ], function(err, subData){
        if(err) {
            if(subData.t) {
                subData.t.rollback();
            }
            res.json({success:false,msg:'保存数据失败'});
        } else {
            subData.t.commit();
            res.json({success:true,note:subData.note});
        }
    })
})

finder.post('/createConcernLostInfo', function(req, res) {
    var act = req.session.act;
    var ps = req.body;
    async.waterfall([
     function(cb){
        enDef.db.transaction().then(function (t) {
            cb(null,{t:t});
        });
     }
    ,function(subData,cb){
        enDef.ConcernLostInfo.findOne({ where: { lost_info_id:ps.lostInfoId,concerner:act.id }} )
            .then(function(concern) {
               if(concern) {
                   cb('你已经关注此信息',subData);
               }else {
                   cb(null,subData);
               }
            }).catch(function (error) {
                cb(error, subData);
            });
    }
    ,function(subData,cb){
        //get id
        dc.getId(req.get('loginKey'), 'com.gy.finder.entity.ConcernLostInfo', 1, function(ids){
            subData.concernId = ids[0];
            cb(null,subData);
        })
    }
    ,function(subData,cb) {
            var note = enDef.ConcernLostInfo.build({
                id: subData.concernId, cancel: false,
                client_id: act.client_id, concerner: act.id, lost_info_id: ps.lostInfoId
            });
            note.save({ silent:true, transaction:subData.t })
                .then(function (anotherTask) {
                    cb(null, subData);
                }).catch(function (error) {
                    cb(error, subData);
                });
        }
    ,function(subData,cb) {
            enDef.LostInfo.findOne({ where: { id:ps.lostInfoId }} )
                .then(function(lostInfo) {
                    lostInfo.set('concernNum',lostInfo.get('concernNum')+1);
                    lostInfo.set('updatedOn',Date.now());
                    lostInfo.save({ silent:true, transaction:subData.t }).then(function(l){
                        subData.num = lostInfo.get('concernNum');
                        cb(null, subData);
                    })
                });
        }
    ], function(err, subData){
        if(err) {
            if(subData.t) {
                subData.t.rollback();
            }
            dc.logger.error(err);
            var msg = typeof err ==='string' ? err:'保存数据失败,可能服务器繁忙，请稍后再试'
            res.json({success:false,msg:msg});
        }else {
            subData.t.commit();
            res.json({success:true,num:subData.num});
        }
    })
})

finder.get('/listConcernLostInfo', function(req, res) {
    var ps = req.query;
    var act = req.session.act;
    var subData = {};
    async.waterfall([
        function (cb) {
            enDef.ConcernLostInfo.findAll({ where:{concerner : act.id } })
                .then(function(clis) {
                    var lostInfoIds = [];
                    if(clis && clis.length > 0 ) {
                        var lids = [];
                        for(var i = 0; i < clis.length; i++ ) {
                            lostInfoIds.push(clis[i].lost_info_id);
                        }
                        subData.lostInfoIds = lostInfoIds;
                        cb(null,subData);
                    }else {
                        cb("NoData",null);
                    }
                });
        }
        ,function(subData,cb) {
            mng.finderManager.getLostInfoByIds(subData.lostInfoIds,function(err,lostInfos){
                subData.lostInfos = lostInfos;
                cb(null,subData);
            });
        }
        ,function(subData,cb) {
            mng.finderManager.getImageMatchByLostInfoIds(subData.lostInfoIds,function(err,matchList){
                subData.matchList = matchList;
                cb(null,subData);
            });
        }
        ,function(subData,cb) {
            mng.finderManager.getLostInfoNoteByLostInfoIds(subData.lostInfoIds,function(err,notes){
                subData.notes = notes;
                cb(null,subData);
            });
        }
    ],function(error,result){
        if(!error) {
            var linfos = mng.finderManager.combineLostInfo(result.lostInfos,result.matchList,result.notes);
            var data = { totalNum:result.totalNum, success:true, items:linfos, cxt:cfg.context };
            res.json(data);
        }else {
            var data = { totalNum:0, success:false, items:[], cxt:cfg.context,msg:error };
            res.json(data);
        }

    })
})


module.exports = finder;