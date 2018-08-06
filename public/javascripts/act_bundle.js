(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var dc = require('./dc.js');

var fieldNames = ['actId','nickName','email','officePhone','homePhone','addrLine1','description','remark'];

dc.act = {}

dc.act.data = {};

dc.act.saveActInfo = function(item){
    if(!dc.act.iconFile) {
        doSaveBaseInfo(item);
        return;
    }
    var formdata = new FormData();
    formdata.append('fileName', dc.act.iconFile.name);
    formdata.append('fieldName', dc.act.iconFile.name);
    formdata.append('file', dc.act.iconFile);
    var url = dc.utils.getWebHttpPath('/file/upload');
    $.ajax({
        type:'POST',
        url:url,
        data:formdata,
        /**
         *必须false才会自动加上正确的Content-Type
         */
        contentType:false,
        /**
         * 必须false才会避开jQuery对 formdata 的默认处理
         * XMLHttpRequest会对 formdata 进行正确的处理
         */
        processData:false
    }).then(function(data){
        if(data.success) {
            dc.act.data.iconUrl = data.url;
            doSaveBaseInfo(item);
        }else {
            alert('error'+data.msg);
        }
    },function(err){
        alert(err);
    });
}

var doSaveBaseInfo = function () {


    for(var i =0; i< fieldNames.length; i++) {
        var v = $('[name=' + fieldNames[i] + ']').val();
        if(v != null && v != '') {
            dc.act.data[fieldNames[i]] = v;
        }
    }
    var actSaveUrl = dc.utils.getWebHttpPath('/uc/updateActInfo');
    $.post(actSaveUrl,dc.act.data,function(responseTxt,statusTxt,xhr){
        if(statusTxt == 'success' && responseTxt.success) {
            dc.act.loadMenuItem($('[name="itemId"]').val());
        } else {
            alert('error'+responseTxt.msg);
        }
    });
}

dc.act.iconFileChange = function (elt) {
    if(!elt.files[0]) {
        return;
    }
    dc.act.iconFile = elt.files[0];
    console.log("Change head icon");
    //var file = $('#actHeadIconSelector').val()
    var reader = new FileReader();
    reader.onload =function(evt) {
        $('#actHeadIcon').attr('src',evt.target.result);
    };
    reader.readAsDataURL(elt.files[0]);
}


dc.act.loadMenuItem = function(itemId) {
    var url = dc.cxt+'/uc/menuItem?id='+ itemId;
    $(".detailBar").load(url, function(responseTxt,statusTxt,xhr){
        if(statusTxt=="success"){
        } else {
            alert("Error: "+xhr.status+": "+xhr.statusText);
        }
    });
}

module.exports = dc;
},{"./dc.js":2}],2:[function(require,module,exports){
var dc = dc || {};
dc.cxt = '/bbs';

dc.init = function() {
    $('#logout').click(function(alink){
        dc.logout(function(err){
            if(!err) {
                dc.goTo(dc.cxt);
            }
        });
        return false;
    });
}

dc.doLogin = function(un,pw,cb) {
    $.post(dc.cxt + '/uc/doLogin',{userName:un,pwd:pw,cid:""},function(responseTxt,statusTxt,xhr){
        if(statusTxt != 'success') {
            cb(responseTxt);
        }else {
            dc.sessionStorage.set('userName',un);
            dc.sessionStorage.set('password',pw);

            dc.localStorage.set('userName',un);
            dc.localStorage.set('password',pw);

            cb(null);
        }
    });
}

dc.logout = function(cb) {
    $.get(dc.cxt + '/uc/logout.html',function(responseTxt,statusTxt,xhr){
        if(statusTxt != 'success') {
            if(cb) {
                cb(responseTxt);
            }
        }else {
            dc.sessionStorage.remove('userName');
            dc.sessionStorage.remove('password');
            if(cb) {
                cb(null);
            }
        }
    });
}

dc.isLogin = function() {
    var un = dc.sessionStorage.get('userName');
    return  un!= null;
}

dc.goTo = function(url) {
    location.href = url;
}

dc.bbs = dc.bbs || {};

dc.bbs.init = function() {

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
        if(!dc.isLogin()) {
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

        $.post(dc.cxt + '/bbs/doCreateTopic',{title:title, typeId: type, content:content},
            function(data,status){
                window.location = dc.cxt;
            }
        );
    });
}

dc.localStorage = new function() {
    //this.updateBrowser_ = dc.utils.i18n.get('update_your_browser');
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
        if(dc.utils.isIe() && dc.utils.version() < 8) {
            return false;
        }else {
            return true;
        }
    }
}

dc.sessionStorage = new function() {
    //this.updateBrowser_ = dc.utils.i18n.get('update_your_browser');
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

dc.utils = {
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
        var wp = 'ws://' + location.host + dc.utils.getWebContextPath()
            + subPath;
        return wp;
    },
    getWebHttpPath : function(subPath) {
        var wp = 'http://' + location.host + dc.utils.getWebContextPath()
            + subPath;
        return wp;
    },
    getStringWidthAsPix : function(str) {
        var span = document.getElementById("widthTester");
        if(span == null) {
            span = document.createElement('span');
        }
        span.style = "font-size:10pt";
        document.body.appendChild(span);
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
    inherits : function(childCtor, parentCtor) {
        function tempCtor() {};
        tempCtor.prototype = parentCtor.prototype;
        childCtor.superClass_ = parentCtor.prototype;
        childCtor.prototype = new tempCtor();
        childCtor.prototype.constructor = childCtor;
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
        center.appendChild(img);
        domHelper.body.appendChild(center);
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
        var request = new dc.utils.HttpRequest(url,params,method,
            async,username,password);
        if(async) {
            request.send(onload, onerror);
        }else {
            request.send();
            return request;
        }
    },
    /**
     * dc.utils.Constants={
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
        return dc.utils.browser[browser] != null;
    },
    version : function() {
        for(var b in dc.utils.browser) {
            return dc.utils.browser[b][1].split('.')[0];
        }
    },
    isIe : function() {
        return this.isBrowser(dc.utils.Constants.IE9) ||
            this.isBrowser(dc.utils.Constants.IE8) ||
            this.isBrowser(dc.utils.Constants.IE7) ||
            this.isBrowser(dc.utils.Constants.IE6)
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
            return new dc.Message(msg);
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
            obj[i] = dc.utils.clone(o);
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
        oHead.appendChild( oScript);
    }
}

dc.utils.Constants={
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

if(!dc.utils.sys) {
    var ua = navigator.userAgent.toLowerCase();
    var s = null;
    var key = null;
    var bv = null;
    if(s = ua.match(/msie ([\d.]+)/)) {
        key = dc.utils.Constants.IE;
        key = key + s[1].split('.')[0];
    }else if(s = ua.match(/firefox\/([\d.]+)/)) {
        key = dc.utils.Constants.firefox
    }else if(s = ua.match(/chrome\/([\d.]+)/)) {
        key = dc.utils.Constants.chrome;
    }else if(s = ua.match(/opera.([\d.]+)/)) {
        key = dc.utils.Constants.opera;
    }else if(s = ua.match(/version\/([\d.]+).*safari/)) {
        key = dc.utils.Constants.safari;
    }
    dc.utils.browser = {};
    if(s != null) {
        dc.utils.browser[key] = [];
        dc.utils.browser[key][0] = s[0].trim();
        dc.utils.browser[key][1] = s[1].trim();
    }
}

dc.utils.HttpRequest = function(url, params, method, async, username, password){
    this.username = username;
    this.password = password;
    this.url = url;
    this.params = params;
    this.method = method || 'post';
    this.async = (async != null) ? async : true;
};


dc.utils.HttpRequest.prototype.isBinary = function(){
    return this.binary;
};


dc.utils.HttpRequest.prototype.setBinary = function(value){
    this.binary = value;
};


dc.utils.HttpRequest.prototype.getText = function(){
    return this.request.responseText;
};


dc.utils.HttpRequest.prototype.isReady = function(){
    return this.request.readyState == 4;
};


dc.utils.HttpRequest.prototype.getXml = function(){
    return this.request.responseXML;
};


dc.utils.HttpRequest.prototype.getText = function(){
    return this.request.responseText;
};


dc.utils.HttpRequest.prototype.getStatus = function(){
    return this.request.status;
};


dc.utils.HttpRequest.prototype.toString = function(){
    return 'Status: ' + this.getStatus() + 'Text: ' + this.getText();
};


dc.utils.HttpRequest.prototype.createRequest_ = function(){
    if (window.XMLHttpRequest){
        return new XMLHttpRequest();
    }else if (typeof(ActiveXObject) != "undefined"){
        return new ActiveXObject("Microsoft.XMLHTTP");
    }
};


dc.utils.HttpRequest.prototype.send = function(onload, onerror){
    this.request = this.createRequest_();
    var handlerResponse = dc.utils.bind(this, function() {
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
    //http://dc.oicp.net:8899/web/resources/i18n_zh-cn.properties
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


dc.utils.HttpRequest.prototype.setRequestHeaders = function(request, params){
    if (params){
        request.setRequestHeader('Content-Type',
            'application/x-www-form-urlencoded');
    }
};

module.exports = dc;


},{}]},{},[1]);
