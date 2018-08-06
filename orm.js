var orm = require('orm');

/*
orm.connect("mysql://root:root@localhost:3306/node",
    function (err, db) {
    if(err) throw "fail to connect " + err.toString();
	  
    }
 );
 */
 var opts = {
    database: "node",
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
	var Person = db.define("t_person", {
        name      : String,
        surname   : String,
        age       : Number, // FLOAT
        male      : Boolean,
        continent : [ "Europe", "America", "Asia" ], // ENUM type
        photo     : Buffer, // BLOB/BINARY
        data      : Object, // JSON encoded
		person_id   : { type: 'serial', key: true }
    },  
	{
        methods: {
            fullName: function () {
                return this.name + ' ' + this.surname;
            }
        },
        validations: {
            age: orm.enforce.ranges.number(18, undefined, "under-age")
        }
    });
	
	//同步 model 到数据库 
	Person.sync(function (err) {
		console.log("create Person table successfully!")
	});
	
}

