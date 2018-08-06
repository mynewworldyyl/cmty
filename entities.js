var orm = require('orm');
 
 var opts = {
    database: "hy",
    protocol: "mysql",
    host: "127.0.0.1",
    username: "root",
    password: "root",
    query: {
        pool: true
    }
};
 
orm.connect(opts, function(err, db) {
   if(err) throw err;
   console.log("connection database successfully");
   initdb(db);
});

initdb = function(db) {

    module.exports.entities = module.exports.entities || {};
	
	module.exports.entities.ClientType = db.define("t_client_type", {
        id           : {type:"text", size:64, key:true},
        name         : {type:"text", size:64, required:true, mapsTo: 'name'},
        description  : {type:"text", size:255, mapsTo: 'desc0'},
        typeCode     : {type:"text", unique:true, required:true, size:20, mapsTo: 'typecode', defaultValue: "Common"},
        createdOn    : {type: "date", time: true , mapsTo: 'created_on' },
        updatedOn    : {type: "date", time: true , mapsTo: 'updated_on'},
      }
	);
	
	module.exports.entities.Client = db.define("t_client", {
        id           : {type:"text", size:64, key:true},
        name         : {type:"text", size:64, required:true, mapsTo: 'name'},
        description  : {type:"text", size:255, mapsTo: 'desc0'},
        remark       : {type:"text", size:255, mapsTo: 'remark'},
        createdOn    : {type: "date", time: true , mapsTo: 'created_on' },
        updatedOn    : {type: "date", time: true , mapsTo: 'updated_on'},
      }
	);
	
	module.exports.entities.Account = db.define("t_account", {
        id           : {type:"integer", size:8, key:true},
        userName     : {type:"text", size:64, required:true, mapsTo: 'acct_name'},
		password     : {type:"text", size:64, mapsTo: 'pwd'},
		status       : {type:"text", size:64, mapsTo: 'status', defaultValue:"Active"},
		iconUrl      : {type:"text", size:128, mapsTo: 'icon_url'},
		nickName     : {type:"text", size:64, mapsTo: 'nick_name'},
		email        : {type:"text", size:64, mapsTo: 'email'},
		officePhone  : {type:"text", size:64, mapsTo: 'office_phone'},
		homePhone    : {type:"text", size:64, mapsTo: 'home_phone'},
		mobile       : {type:"text", size:64, mapsTo: 'mobile'},
		addrLine1    : {type:"text", size:64, mapsTo: 'addr_l1'},
		addrLine2    : {type:"text", size:64, mapsTo: 'addr_l2'},
		mobile       : {type:"text", size:64, mapsTo: 'mobile'},
		typeCode     : {type:"text", unique:true, required:true, size:12, mapsTo: 'type_code', defaultValue: "Common"},
        description  : {type:"text", size:255, mapsTo: 'desc0'},
        remark       : {type:"text", size:255, mapsTo: 'remark'},
        createdOn    : {type: "date", time: true, mapsTo: 'created_on' },
        updatedOn    : {type: "date", time: true , mapsTo: 'updated_on'},
      }
	);
	
	module.exports.entities.Account.hasOne("client", module.exports.entities.Client,
	  {field: 'client_id'});
	  
	 module.exports.entities.Client.hasOne("typecode", module.exports.entities.ClientType,
	  {field: 'typecode'});
	  
	 module.exports.entities.Client.hasOne("parent", module.exports.entities.Client,
	  {field: 'parent_id', reverse: "subClients" });
	  
	  module.exports.entities.ClientType.hasOne("updatedBy", module.exports.entities.Account,
	  {field: 'updated_by'});
	  
	  module.exports.entities.ClientType.hasOne("createdBy", module.exports.entities.Account,
	  {field: 'created_by'});

	  
	//同步 model 到数据库 
	/*
	db.sync(function (err) {
		console.log("create Person table successfully!")
	});
	*/
	
	  module.exports.entities.Account.get(1, function(err, person) {
	   if(err) throw err;
       console.log("get Username: " + person.userName);
     });
	 
	  module.exports.entities.Account.find({id:1}, function(err, person) {
	   if(err) throw err;
       console.log("find Username: " + person[0].userName);
     });
	
	module.exports.entities.Account.one(function(err, person) {
	   if(err) throw err;
       console.log("One Username: " + person.userName);
     });
}

