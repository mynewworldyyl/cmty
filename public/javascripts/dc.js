var xrf = !!xrf ? xrf : {};

xrf.cxt = '/bbs';

xrf.topicPageSize = 9;
xrf.notePageSize = 9;

String.prototype.startWith=function(str){
    var reg=new RegExp("^"+str);
    return reg.test(this);
}

String.prototype.endWith=function(str){
    var reg=new RegExp(str+"$");
    return reg.test(this);
}

xrf.urls = {

    WEB_SOCKET_CONTEXT: '/wsk',

    javaCXT: '/dc/rest',

    //javaIP:'112.74.193.118',
    javaIP:'192.168.18.28',
    //javaIP: '192.168.1.106',
    javaPORT: '9999',
    //javaPORT:'80',

    nodePORT: '3000',
    //nodeIP:'112.74.193.118',
    // nodeIP: '192.168.1.106',
    nodeIP:'192.168.18.28',
    nodeCXT: '',

    //FILE_SERVER:'http://112.74.193.118:3000',
    //FILE_SERVER: 'http://192.168.1.106:3000',
    FILE_SERVER:'http://192.168.18.28:3000',

    PROTOCOL: 'http://',
    //CXT:'/xrf/rest',
    THUBNAIL_SIZE: '&width=60&height=60',
    //User Service

    UPDATE_PWD: '/user/update/pwd',
    MESSAGE_UPLOAD: '/device/message/upload',
    MESSAGE_LIST: '/device/message/list',
    TEST: '/user/test',

    REGISTER: '/user/regist',
    LOGIN: '/user/login',
    LOGOUT: '/user/logout',
    GET_CHECTCODE: '/comm/sms/generatecode',
    UPDATE_ACT_VALUE: '/user/update/act',
    SET_VALUE: '/profile/setValue',
    SET_VALUES: '/profile/setValues',
    SET_CONTENT: '/profile/setContent',
    SET_DATA: '/profile/setData',
    GET_PROFILE: '/profile/getProfile',

    ADD_LOST_INFO: '/finder/addLostInfo',
    UPDATE_LOST_INFO: '/finder/updateLostInfo',
    ADD_PRESENT_INFO: '/finder/presentInfo',
    UPDATE_PRESENT_INFO: '/finder/updatePresentInfo',
    LOAD_PRESENT_INFO: '/finder/listPresentInfo',
    CREATE_LOST_INFO_NOTE: '/finder/createLostInfoNote',
    COLLECT_LOST_INFO: '/finder/collectLostInfo',
    LIST_LOST_INFO: '/finder/listLostInfo',
    LIST_COLLECT_LOST_INFO: '/finder/listCollectLostInfo',
    LIST_MY_COLLECT_LOST_INFO: '/finder/listMyCollectLostInfo',
    MATCH_LIST: '/finder/matchList',
    CONCER_LOST_INFO: '/finder/createConcernLostInfo',
    MY_CONCERN_LOST_INFO_LIST: '/finder/listConcernLostInfo',

    IM_CALL_MOBILE: '/im/callMobile',
    IM_ACTIVE_CHANNEL: '/im/activeChannel',
    IM_JOIN_IN_CHANNEL: '/im/joinLostInfoChannel',
    IM_ADD_FRIEND: '/im/addFriend',
    IM_EXIT_CHANNEL: '/im/exitChannel',

    FILE_UPLOAD: '/bbs/file/mupload',
    UPLOAD_BASE64: '/bbs/file/base64',

    PCFG: '/pcfg',

    cacheUrl: null,
    loginPaths : null

    ,getJavaServerUrl: function (path) {
        if (!this.cacheUrl) {
            this.cacheUrl = this.PROTOCOL + this.javaIP + ':' + this.javaPORT + this.javaCXT;
        }
        return this.cacheUrl + path;
    },

    getNodeServerUrl: function (path) {
        if (!this.nodeCacheUrl) {
            this.nodeCacheUrl = this.PROTOCOL + this.nodeIP + ':' + this.nodePORT + this.nodeCXT;
        }
        return this.nodeCacheUrl + path;
    },

    get: function (path, params, cb, errCb, fullpath) {
        this.ajax(path, params, cb, true, 'GET', errCb, fullpath)
    },

    post: function (path, params, cb, errCb, fullpath) {
        this.ajax(path, params, cb, true, 'POST', errCb, fullpath)
    },

    put: function (path, params, cb, errCb, fullpath) {
        this.ajax(path, params, cb, true, 'PUT', errCb, fullpath)
    },

    test: function () {
        this.ajax(xrf.urls.TEST, {accountName: 'testAccount'}, function (data) {
            alert(data);
            console.log(data);
        }, true, 'GET')
    },

    ajax: function (path, params, sucCb, async, method, errCb, fullpath) {
        if (!sucCb) {
            throw "Callback method cannot be null";
        }

        if (!method) {
            throw "request method cannot be null";
        }

        if (!path) {
            path = "/";
        }

        var self = this;
        self._doAjax(path, params, sucCb, async, method, errCb, fullpath);
    }

    ,_doAjax: function(path, params, sucCb, async, method, errCb, fullpath) {
        /* if(!xrf.urls.checkNetwork()) {
         throw '网络连接不可用';
         }*/
        if(!(path.startWith('http://') || path.startWith('https://'))) {
            path = xrf.urls.getNodeServerUrl(path);
        }
        $.ajax({
            data: params,
            type: method,
            async: true,
            url: path,
            success: function (data, statuCode, xhr) {
                sucCb(data, statuCode, xhr);
            },
            beforeSend: function (xhr) {
                //xhr.setRequestHeader('Access-Control-Allow-Headers','*');
                if (xrf.uc.isLogin()) {
                    xhr.setRequestHeader("loginKey", xrf.uc.curUser.data.loginKey);
                }
            },
            error: function (err, xhr) {
                if (errCb) {
                    errCb(err, xhr);
                } else {
                    sucCb(null, err, xhr);
                }
            }
        });
    }

    ,uploadBase64Picture: function (data, ptype, cb,pos) {
        var params = {
            encode: 'base64',
            imageType: ptype,
            name: 'base64_picture_file' + xrf.utils.getId(),
            contentType: 'image/' + ptype + ';base64',
            base64Data: data,
            pos:pos
        }
        var url = xrf.urls.getNodeServerUrl(xrf.urls.UPLOAD_BASE64);
        xrf.urls.post(url, params, function (data1, status, xhr) {
            console.log(data1);
            if (status !== 'success') {
                cb(status, data1);
            } else {
                cb(null, data1);
            }
        }, function (err, xhr) {
            console.log(err);
            cb(err, null);
        })
    }

    ,postHelper: function(url,params,cb,fullpath){
        xrf.urls.post(url,params, function(data,status,xhr){
            if(data.success) {
                cb(null,data);
            } else {
                cb(data,null);
                xrf.uc.showAlert(data.msg);
            }
        },function(err){
            cb(err,null);
        },fullpath);
    }

    //get: function (path, params, cb, errCb, fullpath)
    ,getHelper: function(url,params,cb,fullpath){
        xrf.urls.get(url,params, function(data,status,xhr){
            if(data.success) {
                cb(null,data);
            } else {
                cb(data,null);
                xrf.uc.showAlert(data.msg);
            }
        },function(err){
            cb(err,null);
        },fullpath);
    }
}

xrf.init = function() {
    $('#logout').click(function(alink){
        xrf.logout(function(err){
            if(!err) {
                xrf.goTo(xrf.cxt);
            }
        });
        return false;
    });
}

xrf.uc = {
    doLogin: function (un, pw, cb) {

        var self = this;
        var url = xrf.urls.getJavaServerUrl(xrf.urls.LOGIN)
        xrf.urls.postHelper(url, {'accountName': un, 'pwd': pw, 'cid': ""},
            function (err, data) {
                if (!err) {
                    //xrf.utils.localStorage.set(xrf.uc.Constants.Username, un);
                    //xrf.utils.localStorage.set(xrf.uc.Constants.Password, pw);
                    self.curUser = data;
                    xrf.uc._handlerLoginSuccess();
                    if (cb) {
                        cb(null, data);
                    }
                }else {
                    if(cb) {
                        cb(err,null);
                    }
                }
            });
    }

    ,logout: function (cb) {
        $.get(xrf.cxt + '/uc/logout.html', function (responseTxt, statusTxt, xhr) {
            if (statusTxt != 'success') {
                if (cb) {
                    cb(responseTxt);
                }
            } else {
                xrf.sessionStorage.remove('userName');
                xrf.sessionStorage.remove('password');
                if (cb) {
                    cb(null);
                }
            }
        });
    }

    ,isLogin : function () {
        return !!this.curUser;
    }

    ,_handlerLoginSuccess : function() {
        
    }
}

xrf.goTo = function(url) {
    location.href = url;
}

xrf.bbs = xrf.bbs || {};

xrf.bbs.init = function() {

    var ue = UE.getEditor('topicEditor',
        {
            toolbars: [
                ['fullscreen', 'source', 'undo', 'redo'],
                ['bold', 'italic', 'underline', 'fontborder', 'strikethrough', 'superscript', 'subscript', 'removeformat', 'formatmatch', 'autotypeset', 'blockquote', 'pasteplain', '|', 'forecolor', 'backcolor', 'insertorderedlist', 'insertunorderedlist', 'selectall', 'cleardoc']
            ],
            autoHeight: false,
            autoHeightEnabled: false,
            autoFloatEnabled: false}
    );

    $('#confirmSubmit').click(function(){
        if(!xrf.isLogin()) {
            alert("未登陆，请先登陆!")
            return;
        }
        var title = $('#topicTitle').val();
        if(title == null || title.trim() == '') {
            alert("标题不能为空");
            return;
        }
        var type = $('#topicType').val();
        if(type == '-1') {
            alert("必须选择帖子类型");
            return;
        }

        var content = ue.getContent();
        if(content == null || content.trim() == '') {
            alert("内容不能为空");
            return;
        }

        $.post(xrf.cxt + '/bbs/doCreateTopic',{title:title, typeId: type, content:content},
            function(data,status){
                window.location = xrf.cxt;
            }
        );
    });
}

xrf.localStorage = new function() {
    //this.updateBrowser_ = xrf.utils.i18n.get('update_your_browser');
    this.set = function(key,value) {
        if(!this.isSupport()) {
            alert(this.updateBrowser_);
            return;
        }
        localStorage.setItem(key,value);
    }

    this.remove = function(key) {
        if(!this.isSupport()) {
            alert(this.updateBrowser_);
            return;
        }
        localStorage.removeItem(key);
    }

    this.get = function(key) {
        if(!this.isSupport()) {
            alert(this.updateBrowser_);
            return;
        }
        return localStorage.getItem(key);
    }

    this.clear = function() {
        if(!this.isSupport()) {
            alert(this.updateBrowser_);
            return;
        }
        if(confirm('this operation will clear all local storage data?')) {
            localStorage.clear();
        }
    }

    this.supportLocalstorage = function() {
        try {
            return window.localStorage !== null;
        } catch (e) {
            return false;
        }
    }

    this.isSupport = function() {
        if(xrf.utils.isIe() && xrf.utils.version() < 8) {
            return false;
        }else {
            return true;
        }
    }
}

xrf.sessionStorage = new function() {
    //this.updateBrowser_ = xrf.utils.i18n.get('update_your_browser');
    this.set = function(key,value) {
        if(!this.supportLocalstorage()) {
            alert(this.updateBrowser_);
            return;
        }
        sessionStorage.setItem(key,value);
    }

    this.remove = function(key) {
        if(!this.supportLocalstorage()) {
            alert(this.updateBrowser_);
            return;
        }
        sessionStorage.removeItem(key);
    }

    this.get = function(key) {
        if(!this.supportLocalstorage()) {
            alert(this.updateBrowser_);
            return;
        }
        return sessionStorage.getItem(key);
    }

    this.clear = function() {
        if(!this.supportLocalstorage()) {
            alert(this.updateBrowser_);
            return;
        }
        if(confirm('this operation will clear all local storage data?')) {
            sessionStorage.clear();
        }
    }

    this.supportLocalstorage = function() {
        try {
            return window.sessionStorage !== null;
        } catch (e) {
            return false;
        }
    }
}

xrf.utils = {
    _genId : 0,

    getId: function(){
        return this._genId ++;
    },

    getUrl: function(url) {
        return this.getWebHttpPath(url);
    },
    getWebContextPath : function() {
        var pathname = location.pathname
        pathname = pathname.substring(1,pathname.length);
        pathname = pathname.substring(0,pathname.indexOf('/'));
        return '/'+pathname;
    },
    getWebWSPath : function(subPath) {
        var wp = 'ws://' + location.host + xrf.utils.getWebContextPath()
            + subPath;
        return wp;
    },
    getWebHttpPath : function(subPath) {
        var wp = 'http://' + location.host + xrf.utils.getWebContextPath()
            + subPath;
        return wp;
    },
    getStringWidthAsPix : function(str) {
        var span = document.getElementById("widthTester");
        if(span == null) {
            span = document.createElement('span');
        }
        span.style = "font-size:10pt";
        document.body.appenxrfhild(span);
        var oldWidth = span.offsetWidth;
        span.innerText= str;
        oldWidth = span.offsetWidth-oldWidth;
        span.innerHTML='';
        if(null != span) {
            document.body.removeChild(span);
        }
        return oldWidth;
    },

    getTimeAsMills: function() {
        return new Date().getTime();
    },

    strByteLength:  function(str)  {
        var i;
        var len;
        len = 0;
        for (i=0;i<str.length;i++)  {
            if (str.charCodeAt(i)>255) len+=2; else len++;
        }
        return len;
    },
    isInteger: function (value)  {
        if ('/^(\+|-)?\d+$/'.test(value )){
            return true;
        }else {
            return false;
        }
    },
    isFloat: function(value){
        if ('/^(\+|-)?\d+($|\.\d+$)/'.test(value )){
            return true;
        }else{
            return false;
        }
    } ,
    checkUrl: function (value){
        var myReg = '/^((http:[/][/])?\w+([.]\w+|[/]\w*)*)?$/';
        return myReg.test( value );
    },
    checkEmail: function (value){
        var myReg = '/^([-_A-Za-z0-9\.]+)@([_A-Za-z0-9]+\.)+[A-Za-z0-9]{2,3}$/';
        return myReg.test(value);
    },
    checkIP:   function (value)   {
        var re='/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/';
        if(re.test( value ))  {
            if( RegExp.$1 <256 && RegExp.$2<256 && RegExp.$3<256 && RegExp.$4<256)
                return true;
        }
        return false;
    },
    inherits : function(chilxrftor, parentCtor) {
        function tempCtor() {};
        tempCtor.prototype = parentCtor.prototype;
        chilxrftor.superClass_ = parentCtor.prototype;
        chilxrftor.prototype = new tempCtor();
        chilxrftor.prototype.constructor = chilxrftor;
    },

    bind : function(scope, funct){
        return function(){
            return funct.apply(scope, arguments);
        };
    },
    removeAllChildren : function(container) {
        if(container) {
            for(var c = container.firstChild; c != null; c = container.firstChild ) {
                container.removeChild(c);
            }
        }
    },
    startLoading : function(domHelper) {
        domHelper = domHelper || document;
        var center = domHelper.createElement('center');
        center.style.paddingTop = "300px";
        center.id='loading_'
        var img = domHelper.createElement('img');
        img.src = 'images/loading.gif';
        center.appenxrfhild(img);
        domHelper.body.appenxrfhild(center);
    },
    stopLoading : function(domHelper) {
        domHelper = domHelper || document;
        domHelper.body.removeChild(domHelper.getElementById('loading_'));
    },
    getAsync : function(url,params,onload,onerror,username,password) {
        if(params) {
            url = url + '?';
            for(var p in params) {
                url = url + p + '=' + params[p]+'&';
            }
        }
        this.r_(url, null, 'get', true, onload, onerror, username, password)
    },

    getSync : function(url,params,username,password) {
        if(params) {
            url = url + '?';
            for(var p in params) {
                url = url + p + '=' + params[p]+'&';
            }
        }
        return this.r_(url, null, 'get', false, null, null, username, password);
    },

    post : function(url,params,onload,onerror,username,password) {
        this.r_(url, params, 'post', true, onload, onerror, username, password);
    },

    postSync : function(url,params,username,password) {
        return this.r_(url, params, 'post', false, null, null, username, password);
    },

    put : function(url,params,onload,onerror,username,password) {
        this.r_(url, params, 'put', true, onload, onerror, username, password);
    },

    putSync : function(url,params,username,password) {
        return this.r_(url, params, 'put', false, null, null, username, password);
    },

    del : function(url,params,onload,onerror,username,password) {
        if(params) {
            url = url + '?';
            for(var p in params) {
                url = url + p + '=' + params[p]+'&';
            }
        }
        this.r_(url, null, 'delete', true, onload, onerror, username, password)
    },

    delSync : function(url,params,username,password) {
        if(params) {
            url = url + '?';
            for(var p in params) {
                url = url + p + '=' + params[p]+'&';
            }
        }
        return this.r_(url, null, 'delete', false, null, null, username, password);
    },

    //params is a map {key:value,key1:value, ... , keyN: vaueN}
    r_: function(url,params,method,async,onload,onerror,username,password){
        //url, params, method, async, username, password
        url = this.getUrl(url);
        var request = new xrf.utils.HttpRequest(url,params,method,
            async,username,password);
        if(async) {
            request.send(onload, onerror);
        }else {
            request.send();
            return request;
        }
    },
    /**
     * xrf.utils.Constants={
        IE6:'ie6',
        IE7:'ie7',
        IE8:'ie8',
        IE9:'ie9',
        IE10:'ie10',
        chrome:'chrome',
        firefox:'firefox',
        safari:'safari',
        opera:'opera'
       only IE to be support version checking
       }
     */
    isBrowser : function(browser) {
        return xrf.utils.browser[browser] != null;
    },
    version : function() {
        for(var b in xrf.utils.browser) {
            return xrf.utils.browser[b][1].split('.')[0];
        }
    },
    isIe : function() {
        return this.isBrowser(xrf.utils.Constants.IE9) ||
            this.isBrowser(xrf.utils.Constants.IE8) ||
            this.isBrowser(xrf.utils.Constants.IE7) ||
            this.isBrowser(xrf.utils.Constants.IE6)
    },
    toJson : function(obj) {
        if(typeof obj === 'string') {
            return obj;
        } else if(typeof obj === 'object') {
            return JSON.stringify(obj);
        }else {
            throw 'obj cannot transfor to Json'
        }
    },
    fromJson : function(jsonStr) {
        console.log(typeof jsonStr);
        if(typeof jsonStr === 'string') {
            var msg = eval('('+jsonStr+')');
            if(msg.status){
                msg.status = eval('('+msg.status+')');
            }
            return new xrf.Message(msg);
        }else if(typeof jsonStr === 'object') {
            return jsonStr;
        } else  {
            throw 'fail from Json: ' + jsonStr;
        }

    },

    fromJ : function(jsonStr) {
        if(typeof jsonStr === 'string') {
            var msg = eval('('+jsonStr+')');
            if(msg.status){
                msg.status = eval('('+msg.status+')');
            }
            return msg;
        }else if(typeof jsonStr === 'object') {
            return jsonStr;
        } else  {
            throw 'fail from Json: ' + jsonStr;
        }

    },

    clone : function(jsObj) {
        var type = typeof jsObj;
        if(type != 'object') {
            return jsObj;
        }
        var obj = {};
        for(var i in jsObj) {
            var o = jsObj[i];
            obj[i] = xrf.utils.clone(o);
        }
        return obj;
    },

    isLoad: function(jsUrl) {
        var scripts = document.getElementsByTagName('script');
        if(!scripts || scripts.length < 1) {
            return false;
        }
        for(var i = 0; i < scripts.length; i++) {
            if(jsUrl == scripts[i].src ) {
                return true;
            }
        }
        return false;
    },

    load: function(jsUrl) {
        if(this.isLoad(jsUrl)) {
            return ;
        }
        var oHead = document.getElementsByTagName('HEAD').item(0);
        var oScript= document.createElement("script");
        oScript.type = "text/javascript";
        oScript.src=jsUrl;
        oHead.appenxrfhild( oScript);
    },

     closeDialog : function(dialogId) {
         if(!dialogId) {
             dialogId='#dialogId';
         }
         $(dialogId).hide().remove();
    },

    info : function(content) {
        var params = {title:'信息',content:content };
        this.showDialog(params);
    },

    warn : function(content) {
        var params = {title:'警告',content:content };
        this.showDialog(params);
    },

    error : function(content) {
        var params = {title:'错误',content:content };
        this.showDialog(params);
    },

    showDialog : function(params) {
        var self = this;
        if(!params) {
            throw 'params is null';
        }

        if(!params.dialogId) {
            params.dialogId='dialogId';
        }

        if(!params.buttons) {
            params.buttons = [];
        }

        for(var i=0; i < params.buttons.length; i++) {
            var btnData = params.buttons[i];
            if(!btnData.methodKey) {
                btnData.methodKey= 'dialogId' + xrf.utils.getId();
            }
        }

        if(params.buttons.length <= 0) {
            params.buttons.push({
                title:'确认',
                methodKey : 'dialogId' + xrf.utils.getId(),
                method:function() {
                    self.closeDialog(params.dialogId);
                }
            })
        }

        var html = new EJS({url: "/secs/dialog.html"}).render(params);
        //var clientHeight = $('body').height();
        //var clientWidth = $('body').width();
        // $(html).find('dialog');

        $("body").prepend(html).show();

        for(var i=0; i< params.buttons.length; i++) {
            var btnData = params.buttons[i];
            var btnNode = $('#'+params.dialogId).find('#' + btnData.methodKey);
            btnNode.data("bntData", btnData);
            btnNode.click(function(){
                var bd = $(this).data('bntData');
                bd.method();
                self.closeDialog();
            })
        }

    }
}

xrf.utils.Constants={
    // debug level
    INFO:'INFO',
    DEBUG:'DEBUG',
    ERROR:'ERROR',
    FINAL:'FINAL',
    DEFAULT:'DEFAULT',
    IE:'ie',
    IE6:'ie6',
    IE7:'ie7',
    IE8:'ie8',
    IE9:'ie9',
    IE10:'ie10',
    chrome:'chrome',
    firefox:'firefox',
    safari:'safari',
    opera:'opera'
}

if(!xrf.utils.sys) {
    var ua = navigator.userAgent.toLowerCase();
    var s = null;
    var key = null;
    var bv = null;
    if(s = ua.match(/msie ([\d.]+)/)) {
        key = xrf.utils.Constants.IE;
        key = key + s[1].split('.')[0];
    }else if(s = ua.match(/firefox\/([\d.]+)/)) {
        key = xrf.utils.Constants.firefox
    }else if(s = ua.match(/chrome\/([\d.]+)/)) {
        key = xrf.utils.Constants.chrome;
    }else if(s = ua.match(/opera.([\d.]+)/)) {
        key = xrf.utils.Constants.opera;
    }else if(s = ua.match(/version\/([\d.]+).*safari/)) {
        key = xrf.utils.Constants.safari;
    }
    xrf.utils.browser = {};
    if(s != null) {
        xrf.utils.browser[key] = [];
        xrf.utils.browser[key][0] = s[0].trim();
        xrf.utils.browser[key][1] = s[1].trim();
    }
}

xrf.utils.HttpRequest = function(url, params, method, async, username, password){
    this.username = username;
    this.password = password;
    this.url = url;
    this.params = params;
    this.method = method || 'post';
    this.async = (async != null) ? async : true;
};


xrf.utils.HttpRequest.prototype.isBinary = function(){
    return this.binary;
};


xrf.utils.HttpRequest.prototype.setBinary = function(value){
    this.binary = value;
};


xrf.utils.HttpRequest.prototype.getText = function(){
    return this.request.responseText;
};


xrf.utils.HttpRequest.prototype.isReady = function(){
    return this.request.readyState == 4;
};


xrf.utils.HttpRequest.prototype.getXml = function(){
    return this.request.responseXML;
};


xrf.utils.HttpRequest.prototype.getText = function(){
    return this.request.responseText;
};


xrf.utils.HttpRequest.prototype.getStatus = function(){
    return this.request.status;
};


xrf.utils.HttpRequest.prototype.toString = function(){
    return 'Status: ' + this.getStatus() + 'Text: ' + this.getText();
};


xrf.utils.HttpRequest.prototype.createRequest_ = function(){
    if (window.XMLHttpRequest){
        return new XMLHttpRequest();
    }else if (typeof(ActiveXObject) != "undefined"){
        return new ActiveXObject("Microsoft.XMLHTTP");
    }
};


xrf.utils.HttpRequest.prototype.send = function(onload, onerror){
    this.request = this.createRequest_();
    var handlerResponse = xrf.utils.bind(this, function() {
        if (this.isReady()){
            var status = this.getStatus();
            if(status == 200) {
                onload(this);
            } else{
                if(onerror) {
                    onerror(this);
                }
                console.log(this.getResponseText());
            }
            this.request.onreadystatechange = null;
        }
    });
    //                             /resources/i18n_zh-cn.properties
    //http://xrf.oicp.net:8899/web/resources/i18n_zh-cn.properties
    if (this.request){
        if (onload && this.async){
            this.request.onreadystatechange = handlerResponse;
        }
        this.request.open(this.method, this.url, this.async,
            this.username, this.password);
        this.setRequestHeaders(this.request, this.params);
        this.request.send(this.params);
        if( !this.async && this.getStatus() != 200) {
            console.log(this.getText());
        }
    }
};


xrf.utils.HttpRequest.prototype.setRequestHeaders = function(request, params){
    if (params){
        request.setRequestHeader('Content-Type',
            'application/x-www-form-urlencoded');
    }
};

//module.exports = xrf;

