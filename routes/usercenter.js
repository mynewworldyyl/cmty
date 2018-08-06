
var dc = require('../dc.js')
var mng = require('../js/manager.js');
var cfg = require('../config.js').ws;
  
var express = require('express');
var userCenter = express.Router();


userCenter.use(function timeLog(req, res, next) {
  console.log('Time: ', Date.now());
  next();
})

userCenter.get('/login.html', function(req, res) {
    dc.render('uc/login',req,res,
        {userInfo: req.session.userInfo})
   //res.render('uc/login', { userInfo: req.session.userInfo });
})

userCenter.post('/doLogin', function(req, resp) {
   
   if(req.session.userInfo) {
       dc.logger.info('Have been login: ', req.session.userInfo);
        //resp.redirect(cfg.context);
        resp.json({success:true,
            data:{ userName:req.session.userInfo.data.usrName,
                key: req.session.userInfo.data.key }
        });
		return;
	 }
	 var params = req.body;

    dc._request.post(dc.getServerPath('rest/user/app/login'),
		{ form: {userName:params.userName, pwd:params.pwd, cid:params.cid} },
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
			    var result = JSON.parse(body);
			    if(result.success) {
					req.session.userInfo = result;
                    dc.logger.info('Login success: ', result.data.userName);
					mng.accountManager.getByName(result.data.userName,function(act){
					   //req.session.userName = act.getUserName()
                        dc._users.push(act);
                        req.session.act = act;
					    //resp.redirect("/");
                        resp.json(result)
					});
				} else {
                    //dc.render('uc/login', req, resp, { userInfo: result , cxt:cfg.context });
                    resp.json(result)
				}
				 dc.logger.info(result)
			} else {
				//dc.render('uc/login',req,resp,  { userInfo: { success:false, msg:"登陆失败"} , cxt:cfg.context });
                resp.json({success:false,msg:'登录失败'});
			}
		}
	 );
	 
})

userCenter.get('/register.html', function(req, res) {
     console.log("register");
    dc.render('uc/register',req,res,
        { userInfo: req.session.userInfo })
	 //res.render('uc/register', { userInfo: req.session.userInfo });
})

userCenter.post('/doRegister', function(req, resp) {
	var params = req.body;
    dc._request.post(dc.getServerPath('rest/user/regist1'),
		{ form: {userName:params.userName, password:params.password, nickName:params.nickName, 
		iconUrl:params.iconUrl, VerificationCode: params.VerificationCode} },
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
			   //var result = JSON.parse(body);
                resp.redirect(cfg.context);
			} else {			
				resp.render('uc/login', { userInfo: result , cxt:cfg.context});
			}
		}
	 );
})

userCenter.post('/checkCode', function(req, res) {
    //dc.checkLogin(req,res);
	var params = req.body;
    dc._request.post(dc.getServerPath('rest/comm/sms/generatecode'),
		{ form: {btype:params.btype, mobile: params.mobile} },
		function (error, response, body) {
			res.json(body);
		}
	 );
})


userCenter.get('/logout.html', function(req, resp) {
	if(!req.session.userInfo) {
        dc.logger.info('Non login: ');
        req.session = null;
        if(req.query.json) {
            resp.json({success:true});
        }else {
            resp.redirect(cfg.context);
        }
		return;
	 }

    var un = req.session.userInfo.data.userName;
    for(var i in dc._users) {
        if(un === dc._users[i].userName) {
            dc._users.splice(i,1);
        }
    }
    dc._request.post(dc.getServerPath('rest/user/app/logout'),
		{},
		function (error, response, body) {
		     var infor = req.session.userInfo;
			 req.session = null;
			 resp.redirect(cfg.context);
		}
	 );
})

var menuList = [
     {name:'基本信息',id:'baseInfo',items:[{id:'act',name:'账号'},{id:'item2',name:'设备'}]},
     {name:'高级信息',id:'advanceInfo',items:[{id:'adv1',name:'高级1'},{id:'adv2',name:'高级1'}]}
];

userCenter.get('/actinfo.html', function(req, res) {

    dc.render('uc/actInfo',req,res,
        { userInfo: req.session.userInfo, act:req.session.act, menus:menuList });

    //res.render('uc/register', { userInfo: req.session.userInfo });
})

userCenter.post('/updateActInfo', function(req, res) {
    mng.accountManager.updateActInfo(req,function(err){
        if(!err) {
            res.json({success:true});
        }else {
            res.json({success:false, msg:"fail"});
        }
    });
})

userCenter.get('/menuItem', function(req, res) {
    var id = req.query.id;
    var act = req.session.act;
    if(!act.iconUrl) {
        act.iconUrl='/images/20150311114136.png';
    }
    dc.render('uc/editors/'+id, req ,res, { itemId:id, act:act });
    //res.render('uc/register', { userInfo: req.session.userInfo });
})

module.exports = userCenter;