var cfg =  require('../config.js').fnd;
var enDef = require('./entityDef.js');
var dc = require('../dc.js');
var async = require('async');

var taskMng = {};

var handlers = { }

taskMng.Typecode = {
    LostInfoImage:'LostInfoImage',
    LostInfoImageCompare:'LostInfoImageCompare',
    CollectLostInfoImageCompare:'CollectLostInfoImageCompare',
    CollectLostInfoImage:'CollectLostInfoImage'
}

taskMng.Task = function(tsk) {
    this.task = tsk;
}

taskMng.Task.prototype.peocessTask = function(){
    var tsk = this.task;
    setTimeout(function(){
        handlers[tsk.typecode](tsk,function(err, subData){
            tsk.set('readyForNext',true);
            if(err) {
                console.log(err);
                tsk.set('status','fail');
            } else {
                tsk.set('status','success');
            }
            tsk.set('isFinish',true);
            tsk.save({ silent:true }).then(function(note){

            });
        });
    }, 3);
}

var hbWorker = function() {

    var includes = [
         {model:enDef.Account, as:'createdBy'}
        ,{model:enDef.Account, as:'updatedBy'}
    ];

    var od = " `Task`.`priority` ASC";
    var whereOpts = {
        is_finish:false
        ,ready_next:true
    };

    //var offset = parseInt(params.offset);
    enDef.Task.findAll({ include:includes,where:whereOpts, order: od,
        offset:0, limit:1 })
        .then(function(tasks) {
            if(!tasks || tasks.length < 1) {
                taskMng.running = false;
                return;
            }
            var count = 0;
            for(var i = 0; i< tasks.length;) {

                var tsk = tasks[i];
                i++;
                handlers[tsk.typecode](tsk,function(){
                    count++;
                    if(count === tasks.length) {
                        taskMng.running = false;
                        setTimeout(hbWorker, 1000);
                    }
                });
            }
        });
}

taskMng.startTask = function(){
    if(taskMng.running){
        return;
    }
    //避免同时多个请求启动
    taskMng.running = true;
    setTimeout(hbWorker, 1000);
}

taskMng.submitTask = function(act,typecode,refId,validDate,callback) {
    async.waterfall([
        function(cb) {
            dc.getId(act.userName, 'com.gy.finder.entity.Task', 1, function(ids){
                var task = enDef.Task.build({
                    id: ids[0], client_id:act.client_id, updated_by:act.id, created_by:act.id
                    , refId:refId, typecode:typecode, imageUrl:'', isFinish:false, readyForNext:true
                    ,validDate:null
                });
                task.save().then(function(anotherTask) {
                    //subData.task = task;
                    cb(null,task);
                }).catch(function(error){
                    console.error(error);
                    cb(error,null);
                });
            })
        },
     ],
    function(err,task){
        if(err) {
            callback(err,null);
        } else {
            var tsk = new taskMng.Task(task);
            tsk.peocessTask();
            callback(null,task);
        }
    });
}

taskMng.registHandler = function(typecode,handler){
    if(handlers[typecode]) {
        throw typecode +' have been register';
    }
    handlers[typecode] = handler;
}

module.exports = taskMng;