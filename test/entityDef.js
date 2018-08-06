var Sequelize = require("sequelize");
var cfg = require("../config.js");

var sequelize = new Sequelize('seq', cfg.db.username, cfg.db.password,
    {
      host: cfg.db.host,
      port: cfg.db.port,
      dialect: cfg.db.dialect, //'mysql',//|'mariadb'|'sqlite'|'postgres'|'mssql',
      timestamps: false,
      pool: {
          max: 5,
          min: 0,
          idle: 10000
      },
      dialectOptions: {
          charset: 'utf8'
      }
  }
);

var Project = sequelize.define('Project', {
    title:       Sequelize.STRING,
    description: Sequelize.TEXT
});
var Task = sequelize.define('Task', {
    title:       Sequelize.STRING,
    description: Sequelize.TEXT,
    deadline:    Sequelize.DATE
});
//Project.hasMany(Task);
Project.belongsTo(Task, {as:'task', foreignKey: 'task_id'});

// query persistence for instances
Project.findOne({where: {id:2}})
    .error(function(err) {
        console.log(err);
    })
    .success(function(prjs) {
        var task = prjs.getTask();
        console.log('query project result: ' + prjs);
    });
/*
sequelize.sync({force:true}).then(function(){
    var task = Task.build({title: 'very important task'})
    //task.title // ==> 'very important task'
   // persist an instance
    task.save()
        .error(function(err) {
            // error callback
            console.log(err);
        })
        .success(function() {
            var prj = Project.build({title: 'project one for ics'});
            prj.setTask(task);
            //task.title // ==> 'very important task'
            // persist an instance
            prj.save()
                .error(function(err) {
                    // error callback
                    console.log(err);
                })
                .success(function() {
                    // query persistence for instances
                     Project.findOne({where: {id:2}})
                        .error(function(err) {
                            console.log(err);
                        })
                        .success(function(prjs) {
                            console.log('query project result: ' + prjs);
                        });
                });
        });
})
*/



