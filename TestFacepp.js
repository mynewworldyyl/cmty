
var faceApi =  require('./js/facepp-node.js');

//var api = new FacePP(cfg.key, cfg.secret, { apiURL : cfg.url });

//上传图片，获取face_id

/*faceApi.detDetect(
    'http://dowcool.com:3001/bbs/file/download?fileId=5555ef992e1bc4a41be7bbd4',
    function(err, result) {
        if (err) {
            console.log(err);
            return;
        }
        console.log(JSON.stringify(result));
    }

)*/


//用于测试的两个图片
// http://dowcool.com:3001/bbs/file/download?fileId=5555ef0b2e1bc4a41be7bbd0
// http://dowcool.com:3001/bbs/file/download?fileId=5555ef992e1bc4a41be7bbd4

/**
 *
 {"face":[{"attribute":{"age":{"range":5,"value":14},"gender":{"confidence":99.8274,"value":"Female"},"race":{"confidence":80.0202,"value":"White"},"smiling":{"value":65.4582}},
 "face_id":"b9c2639be2c289f4cf99f85a54af8dc0","position":{"center":{"x":54.166667,"y":34.782609},"eye_left":{"x":48.260655,"y":28.018509},"eye_right":{"x":62.545833,"y":30.422733},"height":27.329193,"mouth_left":{"x":47.86875,"y"
:40.853043},"mouth_right":{"x":59.387024,"y":42.338385},"nose":{"x":55.035536,"y":35.538758},"width":26.190476},"tag":""}],"img_height":161,"img_id":"f6f3e0c41e155cdc3cd40d0f0171e9f0","img_width":168,"s
ession_id":"cf6cdd912459479ab3cfcf6a4eab2add","url":"http://dowcool.com:3001/bbs/file/download?fileId=5555ef992e1bc4a41be7bbd4"}


 {"face":[{"attribute":{"age":{"range":5,"value":10},"gender":{"confidence":82.3999,"value":"Female"},"race":{"confidence":73.534,"value":"White"},"smiling":{"value":84.3025}},
 "face_id":"ca12be6ffaeec50fcf3ca49becc4d503","position":{"center":{"x":50.310559,"y":41.6},"eye_left":{"x":43.382298,"y":37.00696},"eye_right":{"x":53.822236,"y":32.79176},"height":28.8,"mouth_left":{"x":46.747826,"y":49.43328},"
mouth_right":{"x":55.371242,"y":45.862},"nose":{"x":48.41087,"y":41.8616},"width":22.360248},"tag":""}],"img_height":125,"img_id":"2fa7daf8789c23e58d817a51879afdbe","img_width":161,"session_id":"bff0dcf
04a2f482ba21e9b70397284ab","url":"http://dowcool.com:3001/bbs/file/download?fileId=5555ef0b2e1bc4a41be7bbd0"}
 */

//比较两张图片
/*faceApi.recCompare('b9c2639be2c289f4cf99f85a54af8dc0',
        'ca12be6ffaeec50fcf3ca49becc4d503',
    function(err, rst) {
        if (err) {
            console.log(err);
            return;
        }
    faceApi.getSessionInfo(rst.session_id,function(err,result){
            console.log(JSON.stringify(result));
        })
        console.log(JSON.stringify(rst));
    }
)*/

var dc = require('./dc.js');
(function testSaveChineseCharacter() {
    var subData = {};
    require('async').waterfall([
            function(cb){
                dc._request.post(dc.getServerPath('rest/user/app/login'),
                    { form: {userName:'13266878991', pwd:'888888', cid:''} },
                    function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var result = JSON.parse(body);
                            dc.logger.info(result)
                        } else {
                            dc.logger.info(body)
                        }
                        cb(null,{});
                    }
                );
            },
            function(subData,cb){
                dc.getId('13266878991', 'com.hy.finder.entity.LostInfo', 1, function(ids){
                    cb(null,{lid:ids[0]});
                })
            },
            function(subData, cb){

                var linfo = require('./js/entityDef.js').LostInfo.build({
                    id: subData.lid, name:'中国人', age:33, height:33,
                    updated_by:2, created_by:2, lostDate: new Date(), lostAddr:'上海'
                    ,images:'/bbs/file/download?fileId=5555ef0b2e1bc4a41be7bbd0',
                    contactName:'中国人', contactMobile1:'中国人', contactMobile2:'中国人',
                    description:'中国人', remark:'', email:'中国人',client_id:2
                });

                linfo.save().then(function(anotherTask) {
                    subData.linfo = linfo;
                    cb(null,subData);
                }).catch(function(error){
                    console.error(error);
                    cb(error,null);
                });
            }
            //在这里加并行方法
        ],
        function(err, results){
            console.log(err);
            console.log(results);
        })
})();

