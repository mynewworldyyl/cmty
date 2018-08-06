var mng = require('../js/manager.js');
var dc = require('../dc.js');
var enDef = require('../js/entityDef.js');

/*
mng.accountManager.getByName('13266878991',function(act){
    var client = act.client;
    console.log('getByName ' + act.userName);
    console.log('getByName ' + client.name);
});
*/
mng.accountManager.getById(1,function(act){
    var client = act.client;
    console.log('getByName ' + act.userName);
    console.log('getByName ' + client.name);
});

// query persistence for instances
/*
enDef.Account.findOne({where: {id:1}})
    .error(function(err) {
        console.log(err);
    })
    .success(function(act) {
        var client = act.getClient();
        console.log('query project result: ' + act.userName);
        console.log('query project result: ' + client.name);
});
*/
/*
mng.accountManager.getByName('13266878991',function(act){
    var client = act.getClient();
    client.then(function(c){
        console.log('getByName ' + c.name);
    });
    console.log('getByName ' + act.userName);
    console.log('getByName ' + client.name);
});
*/

/*
mng.accountManager.getByName('13266878991',function(act){

    act.getClient().success(function(client){
        dc.logger.info(client.name);
    });

    dc.logger.info("userName:", act.get('userName'));
    //console.log("password:", act.getPassword());

    dc.logger.info("act.userName:", act.userName);
    dc.logger.info("act.password:", act.password);

    //var client = act.getClient();
    dc.logger.info("act.get(client):", act.get('client'));
    console.log("act.getClient().getName():", act.getClient().getName());
    dc.logger.info("act.client:", act.client);
});
*/


