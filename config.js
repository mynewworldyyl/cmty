
//exports.logDir='/usr/local/server/node/logs'
exports.logDir='D:/nodeLog'

exports.ws = {
    context:'/bbs',
    port: 3000,
    needLoginPath: ['/uc/logout.html',
        '/bbs/createTopic.html','/bbs/doCreateTopic','/bbs/doCreateTopicNote','bbs/createTopicType', '/bbs/noteSupport',
        '/bbs/noteOppose','/bbs/noteAccusation','/bbs/noteFeedback','/bbs/topicAccusation','/bbs/topicFeedback','/bbs/positionTopTopic',
        '/bbs/lockedTopic','/bbs/recallTopic','/bbs/resolveTopic',
        '/finder/updateLostInfo','/finder/collectLostInfo','/finder/createLostInfoNote','/finder/presentInfo','/finder/listPresentInfo'
        ,'/finder/listConcernLostInfo','/finder/createConcernLostInfo','/finder/updatePresentInfo','/finder/listMyCollectLostInfo'
        ,'/im/myChannels','/im/joinLostInfoChannel','/im/channelMsg','/im/personMsg'
        ,'/im/activeChannel','/im/addFriend','/im/exitChannel'
        ,'/ue'
    ]
}

exports.mongo = {
    //host:'localhost',
    //host:'112.74.193.118',
    port: '27017',
    database:'electric',
    //tempUploadDir:'E:/gongyi/tempDir',
    tempUploadDir:exports.logDir,
    username:'electric',
    pw:'electric123',
    //tempUploadDir:'/usr/local/nodejs/worker/uploads'
    //tempUploadDir:'/'
}
exports.db = {
     username:'root',
     password:'Admin112233^&*',
     host : 'localhost',
    /*
    username:'root',
    password:'cqq6688311',
    host : 'localhost',
     */

    /*
     username:'gy',
     password:'cqq6688311',
     host : '112.74.193.118',
     */

    database:'electric',
    port : 3306,
    dialect: 'mysql',
    timestamps: false
}

exports.fws = {
    /*
    serverIP : '112.74.193.118',
    port : 80,
     */

    serverIP : 'localhost',
    port : 9999,

    context: '/electric/',
    heartBeatTime:2*60*100
}

exports.wx = {
    plUrl : 'http://120.24.232.177/wx',

    url:'https://api.weixin.qq.com/cgi-bin/',
    appID : 'wxd6357fe6b5985388',
    appSecret : '79e2582f03cf7095fa52c96a813e46d5',
    EncodingAESKey:'BNMMKxDLafjFxZeL3zwEtCrw0FhRxuT47MXiBVWygNW',
    Token: 'dowcool',


   /* url:'https://api.weixin.qq.com/cgi-bin/',
    //wxf15ceeb394b4121c
    appID : 'wxf15ceeb394b4121c',
    //2b1e3247ce98e997433338ad25e95259
    appSecret : '2b1e3247ce98e997433338ad25e95259',
    //测试账号无EncodingAESKey
    //EncodingAESKey:'BNMMKxDLafjFxZeL3zwEtCrw0FhRxuT47MXiBVWygNW',
    Token: 'test123',*/
    AccessTokenTimeout:60*1000
}


exports.fnd = {
    key:'060a03c468e9b348aa0d321511fcbe78',
    secret:'NNltrUhrDjHWexU0nMZ6zIhscnon2bVe',
    url:'http://apicn.faceplusplus.com/v2'
}

exports.websocket = {
    port:5000
}
