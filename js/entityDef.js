var Sequelize = require("sequelize");
var cfg = require("../config.js").db;

/*var cls = require('continuation-local-storage');
var namespace = cls.createNamespace('gy');
Sequelize.cls= namespace;
*/

module.exports.Sequelize = Sequelize;

module.exports.db = new Sequelize(cfg.database, cfg.username, cfg.password,
    {
      host: cfg.host,
      port: cfg.port,
      dialect: cfg.dialect, //'mysql',//|'mariadb'|'sqlite'|'postgres'|'mssql',
      timestamps: false,
      pool: {
          max: 5,
          min: 0,
          idle: 10000
      },
      define: {
        timestamps: false
        ,freezeTableName: true
        ,charset:'utf8'
        ,collate: 'utf8_general_ci'
      }
  }
);
/*module.exports.db.query("SET character_set_client=utf8;character_set_connection=utf8",
    { type: sequelize.QueryTypes.UPDATE });*/

/*this.db.transaction().then(function (t) {
    this.db.set(
        {
             character_set_client:'utf8'
            ,character_set_connection:'utf8'
        },
        { transaction: t}
    );
})*/


module.exports['ClientType'] = this.db.define("ClientType", {
        id           : {type: Sequelize.STRING(64), primaryKey:true, comment: "I'm a comment!"},
        name         : {type: Sequelize.STRING(64), field: 'name', unique:true, allowNull: false},
        description  : {type: Sequelize.STRING(255), field: 'description'},
        typeCode     : {type: Sequelize.STRING(20), unique:true, allowNull:false, field: 'typecode', defaultValue: "Common"},
        createdOn    : {type: Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn    : {type: Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
      },
	  {
	     timestamps: false,
		 freezeTableName: true,
		 tableName: 't_client_type'
	  }
	  
);

module.exports.Client = this.db.define("Client", {
        id           : {type: Sequelize.STRING(8), primaryKey:true},
        name         : {type: Sequelize.STRING(64), field: 'name', unique:true, allowNull: false},
        description  : {type: Sequelize.STRING(255), field: 'description'},
        remark       : {type: Sequelize.STRING(255), field: 'remark'},
        createdOn    : {type: Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn    : {type: Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
      },
	  {
	      timestamps: false,
		  freezeTableName: true,
		  tableName: 't_client'
	  }
	  
	);
	//Client关联关系
	//一对多单向关联，多端
module.exports.Client.belongsTo(module.exports.ClientType, {foreignKey: 'typecode'});
	//以下两行构建树结构，多端为子结点，子结点导向父结点; 一端了父结点导向子结点
	//一对多双向关联,多端
module.exports.Client.belongsTo(module.exports.Client, {as:'parent', foreignKey: 'parent_id'});
	//一对多单向关联，一端
module.exports.Client.hasMany(module.exports.Client, {as: 'subClients',foreignKey: 'parent_id'});

module.exports.Account = this.db.define("Account", {
        id           : {type:Sequelize.BIGINT(20), primaryKey:true},
        userName     : {type:Sequelize.STRING(64), unique:true, allowNull: false, field: 'acct_name'},
		password     : {type:Sequelize.STRING(64), field: 'pwd'},
		status       : {type:Sequelize.STRING(64), field: 'status', defaultValue:"Active"},
		iconUrl      : {type:Sequelize.STRING(64), field: 'icon_url'},
		nickName     : {type:Sequelize.STRING(64), field: 'nick_name'},
		email        : {type:Sequelize.STRING(64), field: 'email'},
		officePhone  : {type:Sequelize.STRING(64), field: 'office_phone'},
		homePhone    : {type:Sequelize.STRING(64), field: 'home_phone'},
		mobile       : {type:Sequelize.STRING(64), field: 'mobile'},
		addrLine1    : {type:Sequelize.STRING(64), field: 'addr_l1'},
		addrLine2    : {type:Sequelize.STRING(64), field: 'addr_l2'},
		typeCode     : {type:Sequelize.STRING(64), field: 'type_code', unique:true, allowNull: false, defaultValue: "Common"},
        description  : {type:Sequelize.STRING(64), field: 'desc0'},
        remark       : {type:Sequelize.STRING(64), field: 'remark'},
        personId     : {type:Sequelize.STRING(64), field: 'person_id',defaultValue:''},
        integral     : {type:Sequelize.INTEGER, field: 'integral'},
        totalIntegral: {type:Sequelize.INTEGER, field: 'total_integral'},
        level        : {type:Sequelize.INTEGER, field: 'level'},
        levelName    : {type:Sequelize.STRING(64), field: 'level_name'},
        createdOn    : {type: Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn    : {type: Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
      },
	  {
	      timestamps: false,
		  freezeTableName: true,
		  tableName: 't_account',
          instanceMethods: {
              getClient1: function() {
                  // how to implement this method ?
                  return this.__factory.associations['Client'].target.count({ where: { id: this.client_id } });
              },
              getAttrs: function() {
                  return this.attrs;
              }
          }
	  }
	  
	);
	//Account关联关系
    //一对多单向关联，多端
module.exports.Account.belongsTo(module.exports.Client, {as:'client', foreignKey: 'client_id'});

	//module.exports.ClientType.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
	//module.exports.ClientType.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});

module.exports.Attr = this.db.define("Attr", {
        id           : {type:Sequelize.BIGINT(20), primaryKey:true},
        name      : {type:Sequelize.STRING(1000), field: 'name', allowNull: false},
        value   : {type:Sequelize.INTEGER, field: 'value',defaultValue:0},
        model    : {type:Sequelize.INTEGER, field: 'model',defaultValue:0},
        belongId    : {type:Sequelize.INTEGER, field: 'belong_id',defaultValue:0},
        type          : {type:Sequelize.INTEGER, field: 'type', allowNull: false},
        createdOn    : {type: Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn    : {type: Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
    },
    {
        timestamps: false,
        freezeTableName: true,
        tableName: 't_attr'
    }
);
module.exports.Attr.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.Attr.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
module.exports.Attr.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});
module.exports.Account.hasMany(module.exports.Attr, {as: 'attrs', foreignKey: 'belong_id'});

module.exports.TopicType = this.db.define("TopicType", {
        id           : {type:Sequelize.BIGINT(20), primaryKey:true},
        description  : {type:Sequelize.STRING(128), allowNull: false, field: 'description'},
        title        : {type:Sequelize.STRING(128), field: 'title', allowNull: false},
        createdOn    : {type: Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn    : {type: Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
      },
	  {
	     timestamps: false,
		 freezeTableName: true,
		 tableName: 't_topic_type'
	  }
	  
	);
module.exports.TopicType.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.TopicType.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
module.exports.TopicType.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});


module.exports.Topic = this.db.define("Topic", {
        id           : { type:Sequelize.BIGINT(20), primaryKey:true },
		title        : { type:Sequelize.STRING(200), field: 'title' , allowNull: false},
		content      : { type:Sequelize.STRING(3000), field: 'content' , allowNull: false},
        readNum      : { type:Sequelize.INTEGER, field: 'read_num', defaultValue:0 },
        noteNum      : { type:Sequelize.INTEGER, field: 'note_num', defaultValue:0 },
        resolved     : { type:Sequelize.BOOLEAN, field: 'resolved', defaultValue:false },
        recall       : { type:Sequelize.BOOLEAN, field: 'recall', defaultValue:false },
        locked       : { type:Sequelize.BOOLEAN, field: 'locked', defaultValue:false },
        topSeq       : { type:Sequelize.INTEGER, field: 'top_seq', defaultValue:1 },
        essence      : { type:Sequelize.BOOLEAN, field: 'essence', defaultValue:false },
        firstTopic   : { type:Sequelize.BOOLEAN, field: 'first_topic', defaultValue:false },
        createdOn    : { type: Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn    : { type: Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
      },
	  {
	     timestamps: false,
		 freezeTableName: true,
		 tableName: 't_topic'
	  }
	);
module.exports.Topic.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.Topic.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
module.exports.Topic.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});
module.exports.Topic.belongsTo( module.exports.TopicType, {as: "topicType", foreignKey: 'topic_type'});

module.exports.Note = this.db.define("Note", {
        id           : {type:Sequelize.BIGINT(20), primaryKey:true},
        content      : {type:Sequelize.STRING(1000), field: 'content', allowNull: false},
        supportNum   : {type:Sequelize.INTEGER, field: 'support_num',defaultValue:0},
        opposeNum    : {type:Sequelize.INTEGER, field: 'oppose_num',defaultValue:0},
        seq          : {type:Sequelize.INTEGER, field: 'seq', allowNull: false},
        createdOn    : {type: Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn    : {type: Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
    },
    {
        timestamps: false,
        freezeTableName: true,
        tableName: 't_note'
    }

);
module.exports.Note.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.Note.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
module.exports.Note.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});
module.exports.Note.belongsTo( module.exports.Topic, {as: "topic", foreignKey: 'topic_id'});
module.exports.Note.belongsTo( module.exports.Note, {as: "forNote", foreignKey: 'note_id'});

module.exports.WXToDcAccount = this.db.define("WXToDcAccount", {
        id           : {type:Sequelize.BIGINT(20), primaryKey:true},
        openId       : {type:Sequelize.STRING(128), allowNull: false, field: 'description'},
        //title        : {type:Sequelize.STRING(128), field: 'title', allowNull: false},
        createdOn    : {type: Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn    : {type: Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
    },
    {
        timestamps: false,
        freezeTableName: true,
        tableName: 't_wx_dc_act'
    }

);
module.exports.WXToDcAccount.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.WXToDcAccount.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
module.exports.WXToDcAccount.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});


module.exports.LostInfo = this.db.define("LostInfo", {
        id             : {type:Sequelize.BIGINT(20), primaryKey:true},
        name           : {type:Sequelize.STRING(64), field: 'name',defaultValue:''},
        age            : {type:Sequelize.INTEGER, field: 'age',defaultValue:0},
        height         : {type:Sequelize.INTEGER, field: 'height',defaultValue:0},
        concernNum     : {type:Sequelize.INTEGER, field: 'concern_num',defaultValue:0},
        lostDate       : {type:Sequelize.DATE, field: 'lost_date'},
        lostAddr       : {type:Sequelize.STRING(255), field: 'lost_addr',defaultValue:''},
        contactName    : {type:Sequelize.STRING(64), field: 'contact_name',defaultValue:''},
        contactMobile1 : {type:Sequelize.STRING(32), field: 'mobile1' ,defaultValue:''},
        contactMobile2 : {type:Sequelize.STRING(32), field: 'mobile2',defaultValue:''},
        description    : {type:Sequelize.STRING(2048), field: 'desc0',defaultValue:''},
        remark         : {type:Sequelize.STRING(255), field: 'remark',defaultValue:'' },
        //头像图片地址URL
        images         : {type:Sequelize.STRING(128), field: 'images' ,defaultValue:''},
        email          : {type:Sequelize.STRING(32), field: 'email',defaultValue:''},
        //创建人与丢失人关系
        relativedName : {type:Sequelize.STRING(32), field: 'relatived_name',defaultValue:''},
        //指纹图片URL
        figurePrint   : {type:Sequelize.STRING(128), field: 'figure_print',defaultValue:''},
        //悬赏金额
        fbSum          : {type:Sequelize.INTEGER, field: 'fb_sum',defaultValue:0},
        //悬赏描述
        fdDesc : {type:Sequelize.STRING(255), field: 'fd_desc' ,defaultValue:''},
        //指纹匹配度通知最小值
        fpNotifyRange          : {type:Sequelize.INTEGER, field: 'fp_range',defaultValue:50},
        ////头像匹配度通知最小值
        hiNotifyRange          : {type:Sequelize.INTEGER, field: 'hi_range',defaultValue:50},
       //身份证号
        idNum          : {type:Sequelize.STRING(32), field: 'id_num',defaultValue:''},
        //身份证正反面图片
        idPicture0   : {type:Sequelize.STRING(128), field: 'id_picture0',defaultValue:''},
        idPicture1   : {type:Sequelize.STRING(128), field: 'id_picture1',defaultValue:''},
        //第三方图片所有者标识
        personId       : {type:Sequelize.STRING(64), field: 'person_id',defaultValue:''},
        //性别
        sex             : {type:Sequelize.STRING(12), field: 'sex',defaultValue:'male'},
        //有脸分析结果获取时间
        faceCreatedOn  : {type:Sequelize.DATE, field: 'face_created_on'},
        //是否已找到并关闭
        isClose        : {type:Sequelize.BOOLEAN, field: 'is_close', defaultValue:false },
        //是否已经丢失
        isLost         : {type:Sequelize.BOOLEAN, field: 'is_lost', defaultValue:false },
        latitude       : {type:Sequelize.STRING(32), field: 'latitude' },
        longitude      : {type:Sequelize.STRING(32), field: 'longitude' },
        pos             : {type:Sequelize.STRING(256), field: 'pos' },
        //loc             : {type:Sequelize.STRING(128), field: 'loc' },
        //讨论组频道号
        channelNum     : {type:Sequelize.STRING(8), field: 'channel_num',defaultValue:'0' },
        createdOn      : {type:Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn      : {type:Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
    },
    {
        timestamps: false,
        freezeTableName: true,
        tableName: 't_lost_info'
    }
);
module.exports.LostInfo.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.LostInfo.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
module.exports.LostInfo.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});

module.exports.LostInfoNote = this.db.define("LostInfoNote", {
        id           : {type:Sequelize.BIGINT(20), primaryKey:true},
        content      : {type:Sequelize.TEXT, field: 'content', allowNull: false},
        //supportNum   : {type:Sequelize.INTEGER, field: 'support_num',defaultValue:0},
        //opposeNum    : {type:Sequelize.INTEGER, field: 'oppose_num',defaultValue:0},
        images       : {type:Sequelize.STRING(1024), field: 'images' },
        seq          : {type:Sequelize.INTEGER, field: 'seq', allowNull: false},
        createdOn    : {type: Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn    : {type: Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
    },
    {
        timestamps: false,
        freezeTableName: true,
        tableName: 't_lost_info_note'
    }

);
module.exports.LostInfoNote.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.LostInfoNote.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
module.exports.LostInfoNote.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});
module.exports.LostInfoNote.belongsTo( module.exports.LostInfo, {as: "lostInfo", foreignKey: 'lost_info_id'});
module.exports.LostInfoNote.belongsTo( module.exports.LostInfoNote, {as: "forNote", foreignKey: 'note_id'});


module.exports.CollectLostInfo = this.db.define("CollectLostInfo", {
        id             : {type:Sequelize.BIGINT(20), primaryKey:true},
        name           : {type:Sequelize.STRING(64), field: 'name'},
        age            : {type:Sequelize.INTEGER, field: 'age',defaultValue:0},
        height         : {type:Sequelize.INTEGER, field: 'height',defaultValue:0},
        foundDate      : {type:Sequelize.DATE, field: 'found_date'},
        foundAddr      : {type:Sequelize.STRING(255), field: 'found_addr',defaultValue:''},
        contactName    : {type:Sequelize.STRING(64), field: 'contact_name',defaultValue:''},
        description    : {type:Sequelize.STRING(2048), field: 'desc0',defaultValue:''},
        contactMobile1 : {type:Sequelize.STRING(32), field: 'mobile1' },
        latitude       : {type:Sequelize.STRING(32), field: 'latitude' },
        longitude      : {type:Sequelize.STRING(32), field: 'longitude' },
        pos            : {type:Sequelize.STRING(256), field: 'pos' },
        loc            : {type:Sequelize.STRING(128), field: 'loc' },
        remark         : {type:Sequelize.STRING(255), field: 'remark' },
        images         : {type:Sequelize.STRING(128), field: 'images',defaultValue:''},
        figurePrint    : {type:Sequelize.STRING(128), field: 'figure_print',defaultValue:''},
        isClose        : {type:Sequelize.BOOLEAN, field: 'is_close', defaultValue:false },
        createdOn      : {type:Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn      : {type:Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
    },
    {
        timestamps: false,
        freezeTableName: true,
        tableName: 't_collect_lost_info'
    }
);
module.exports.CollectLostInfo.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.CollectLostInfo.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
module.exports.CollectLostInfo.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});

module.exports.ImageData = this.db.define("ImageData", {
        id           : {type:Sequelize.BIGINT(20), primaryKey:true},
        //些图片所属
        refId        : {type:Sequelize.BIGINT(20), allowNull: true, field: 'ref_id' },
        ownerMod     : {type:Sequelize.STRING(64), allowNull: true, field: 'owner_mod' },
        //mongod 里面的fileID
        imageId      : {type:Sequelize.STRING(128), allowNull: false, field: 'image_id'},
        //mongod对应下载此图片的URL，除去IP和端口
        imageUrl     : {type:Sequelize.STRING(128), allowNull: true, field: 'image_url'},
        //图片人脸数量
        faceCount    : {type:Sequelize.INTEGER, allowNull: true, field: 'face_count'},
        //取得人脸分析结果时间
        gotResultOn  : {type: Sequelize.DATE, field: 'got_result_on', defaultValue: Sequelize.NOW },
        //临时图片在第三方库超时时间，超过此时间需要重新上会传图片
        timeout      : {type:Sequelize.INTEGER, field: 'timeout',defaultValue:72},
        //向第三方取分析结果唯一标识
        sessionId    : {type:Sequelize.STRING(128), allowNull: true, field: 'session_id'},
        //图片在第三方系统中的ID
        thirdImgId   : {type:Sequelize.STRING(128), allowNull: true, field: 'third_img_id'},
        //图片宽
        imgWidth     : {type:Sequelize.INTEGER, allowNull: true, field: 'img_width'},
        //图片人脸数量
        imgHeight    : {type:Sequelize.INTEGER, allowNull: true, field: 'img_height'},
        //result第三方分析结果，json格式
        result       : {type:Sequelize.TEXT, allowNull: true, field: 'result'},

        createdOn    : {type: Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn    : {type: Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
    },
    {
        timestamps: false,
        freezeTableName: true,
        tableName: 't_img_data'
    }

);
module.exports.ImageData.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.ImageData.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
module.exports.ImageData.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});


module.exports.Face = this.db.define("Face", {
        id           : {type:Sequelize.BIGINT(20), primaryKey:true},
        //ImageData表外键
        //imageId      : {type:Sequelize.STRING(128), allowNull: false, field: 'image_id'},
        ownerMod     : {type:Sequelize.STRING(64), allowNull: true, field: 'owner_mod' },
        //第三方图片唯一标识
        faceId       : {type:Sequelize.STRING(128), allowNull: false, field: 'face_id'},
        faceJson     : {type:Sequelize.TEXT, allowNull: false, field: 'face_json'},
        createdOn    : {type:Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn    : {type:Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
    },
    {
        timestamps: false,
        freezeTableName: true,
        tableName: 't_face'
    }

);
module.exports.Face.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.Face.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
module.exports.Face.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});
module.exports.Face.belongsTo( module.exports.ImageData, {as: "imageData", foreignKey: 'image_id'});

module.exports.ImageMatch = this.db.define("ImageMatch", {
        id           : {type:Sequelize.BIGINT(20), primaryKey:true},
        ownerMod     : {type:Sequelize.STRING(64), allowNull: true, field: 'owner_mod' },
        //指向LostInfo或CollectLostInfo表
        //refId        : {type:Sequelize.BIGINT(20), field: 'ref_id'},
        //源图片ID
        //imageUrl     : {type:Sequelize.STRING(255), allowNull: true, field: 'image_url'},
        //collectLostInfoId   : {type:Sequelize.BIGINT(20), allowNull: false, field: 'coll_li_id'},
        //目标图片ID
        //lostInfoId  : {type:Sequelize.BIGINT(20), allowNull: false, field: 'lost_info_id'},
        //源脸ID
        srcFaceId    : {type:Sequelize.BIGINT(20), allowNull: false, field: 'src_face_id'},
        //目标脸部ID
        destFaceId   : {type:Sequelize.BIGINT(20), allowNull: false, field: 'dest_face_id'},
        //result第三方分析结果，json格式
        result       : {type:Sequelize.TEXT, allowNull: true, field: 'result'},
        //各部位相似度
        month        : {type:Sequelize.FLOAT, allowNull: true, field: 'month'},
        eyebrow      : {type:Sequelize.FLOAT, allowNull: true, field: 'eyebrow'},
        eye          : {type:Sequelize.FLOAT, allowNull: true, field: 'eye'},
        nose         : {type:Sequelize.FLOAT, allowNull: true, field: 'nose'},
        //整体相似度
        similarity   : {type: Sequelize.FLOAT, allowNull: true, field: 'similarity'},
        createdOn    : {type: Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn    : {type: Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
    },
    {
        timestamps: false,
        freezeTableName: true,
        tableName: 't_img_match'
    }

);
module.exports.ImageMatch.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.ImageMatch.belongsTo( module.exports.CollectLostInfo, {as:'collectLostInfo', foreignKey: 'coll_li_id'});
module.exports.ImageMatch.belongsTo( module.exports.LostInfo, {as:'lostInfo', foreignKey: 'lost_info_id'});


module.exports.Task = this.db.define("Task", {
        id             : {type:Sequelize.BIGINT(20), primaryKey:true},
        typecode       : {type:Sequelize.STRING(64), field: 'typecode'},
        refId          : {type:Sequelize.BIGINT(20), field: 'ref_id'},
        //the task step
        stepIndex      : {type:Sequelize.INTEGER, field: 'step_index', defaultValue:0 },
        //优先级
        priority       : {type:Sequelize.INTEGER, field: 'priority', defaultValue:0 },
        //success fail
        status         : {type:Sequelize.STRING(32), field: 'status', defaultValue:'success' },
        isFinish       : {type:Sequelize.BOOLEAN, field: 'is_finish', defaultValue:false },
        readyForNext   : {type:Sequelize.BOOLEAN, field: 'ready_next', defaultValue:true },
        valid           : {type:Sequelize.BOOLEAN, field: 'is_valid', defaultValue:false },
        remark          : {type:Sequelize.STRING(1024), field: 'remark', defaultValue:'' },
        ext0            : {type:Sequelize.STRING(1024), field: 'ext0', defaultValue:'' },
        ext1            : {type:Sequelize.STRING(1024), field: 'ext1', defaultValue:'success' },
        ext2            : {type:Sequelize.STRING(1024), field: 'ext2', defaultValue:'success' },

        //有效期
        validDate      : {type:Sequelize.DATE, field: 'valid_date', defaultValue: null },
        createdOn      : {type:Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn      : {type:Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
    },
    {
        timestamps: false,
        freezeTableName: true,
        tableName: 't_task'
    }
);
module.exports.Task.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.Task.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
module.exports.Task.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});


module.exports.Channel = this.db.define("Channel", {
        id             : {type:Sequelize.BIGINT(20), primaryKey:true},
        channelName    : {type:Sequelize.STRING(64), allowNull: false, field: 'channel_name' },
        description    : {type:Sequelize.STRING(512), allowNull: true, field: 'desc0', defaultValue:''},
        typecode       : {type:Sequelize.STRING(16), allowNull: false, field: 'typecode', defaultValue:'Public'},
        refId          : {type:Sequelize.BIGINT(20),allowNull: false, field: 'ref_id', defaultValue:0},
        channelNum     : {type:Sequelize.STRING(8), allowNull: false, field: 'channel_num' },
        mod             : {type:Sequelize.STRING(16), allowNull: false, field: 'mod0',defaultValue:''},
        createdOn      : {type:Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn      : {type:Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
    },
    {
        timestamps: false,
        freezeTableName: true,
        tableName: 't_channel'
    }

);
module.exports.Channel.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.Channel.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
module.exports.Channel.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});

module.exports.Channel.belongsToMany(module.exports.Account, { as:'deputy'
    ,foreignKey: { name: 'channel_id', allowNull: false }
    ,otherKey:{name: 'account_id', allowNull: false }
    ,through:'r_deputy_channel'
});

module.exports.Channel.belongsToMany(module.exports.Account, { as:'user',
    foreignKey: {name:'channel_id', allowNull: false}
    ,otherKey:{name:'account_id', allowNull: false }
    ,through:'r_users_channel'
});

module.exports.Account.belongsToMany(module.exports.Channel, { as:'channel',
    foreignKey: { name: 'account_id', allowNull: false}
    ,otherKey:{name: 'channel_id', allowNull: false }
    ,through:'r_users_channel'
});

module.exports.Group = this.db.define("Group", {
        id             : {type:Sequelize.BIGINT(20), primaryKey:true},
        name           : {type:Sequelize.STRING(64), allowNull: false, field: 'name',defaultValue:'defGroup' },
        desc0          : {type:Sequelize.STRING(512), allowNull: true, field: 'desc0', defaultValue:''},
        //typecode       : {type:Sequelize.STRING(16), allowNull: false, field: 'typecode', defaultValue:'Public'},
        createdOn      : {type:Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn      : {type:Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
    },
    {
        timestamps: false,
        freezeTableName: true,
        tableName: 't_group'
    }

);
module.exports.Group.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.Group.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
module.exports.Group.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});
module.exports.Group.belongsTo( module.exports.Account, {as: "owner", foreignKey: 'owner_id'});

module.exports.Group.belongsToMany(module.exports.Account, { as:'friend'
    ,foreignKey: { name: 'group_id', allowNull: false }
    ,otherKey:{name: 'account_id', allowNull: false }
    ,through:'r_group_friends'
});


module.exports.ConcernLostInfo = this.db.define("ConcernLostInfo", {
        id             : {type:Sequelize.BIGINT(20), primaryKey:true},
        cancel         : {type:Sequelize.BOOLEAN, field: 'cancel', defaultValue:true },
        createdOn      : {type:Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW }
    },
    {
        timestamps: false,
        freezeTableName: true,
        tableName: 't_concern_lost_info'
    }
);
module.exports.ConcernLostInfo.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.ConcernLostInfo.belongsTo( module.exports.Account, {as: "concerner1", foreignKey: 'concerner'});
module.exports.ConcernLostInfo.belongsTo( module.exports.LostInfo, {as: "lostInfo", foreignKey: 'lost_info_id'});

module.exports.Message = this.db.define("Message", {
        mid            : {type:Sequelize.BIGINT(20), primaryKey:true},
        to             : {type:Sequelize.STRING(32), field: 'to1', defaultValue:'' },
        content        : {type:Sequelize.TEXT, field: 'content', defaultValue:0 },
        sendDate       : {type:Sequelize.DATE, field: 'send_date', defaultValue:Sequelize.NOW},
        //isNew         : {type:Sequelize.INTEGER, field: 'isNew', defaultValue:true },
        typecode       : {type:Sequelize.STRING(16), field: 'typecode', defaultValue:'' },
        one2one        : {type:Sequelize.BOOLEAN, field: 'one2one', defaultValue:true },
        read            : {type:Sequelize.BOOLEAN, field: 'read1', defaultValue:false },
        tos             : {type:Sequelize.TEXT, field: 'tos', defaultValue:'' },
        createdOn      : {type:Sequelize.DATE, field: 'created_on', defaultValue: Sequelize.NOW },
        updatedOn      : {type:Sequelize.DATE, field: 'updated_on', defaultValue: Sequelize.NOW }
    },
    {
        timestamps: false,
        freezeTableName: true,
        tableName: 't_message'
    }
);
module.exports.Message.belongsTo( module.exports.Client, {as:'client', foreignKey: 'client_id'});
module.exports.Message.belongsTo( module.exports.Account, {as: "updatedBy", foreignKey: 'updated_by'});
module.exports.Message.belongsTo( module.exports.Account, {as: "createdBy", foreignKey: 'created_by'});

//module.exports.db.sync({force: false}).then();
