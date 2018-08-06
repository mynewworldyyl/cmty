var AJAX = AJAX||{};
AJAX.send = function(opts){
    var defaults = {
        method: 'GET',
        url: '',
        data: '',
        async: true,
        cache: true,
        contentType: 'application/x-www-form-urlencoded',
        success: function (){},
        error: function (){}
    };
    for(var key in opts){
        defaults[key] = opts[key];
    }
    if(typeof defaults.data === 'object'){
        var str = '';
        var value = '';
        for(var key in defaults.data){
            value = defaults.data[key];
            if( defaults.data[key].indexOf('&') !== -1 ) value = defaults.data[key].replace(/&/g, escape('&'));
            if( key.indexOf('&') !== -1 )  key = key.replace(/&/g, escape('&'));
            str += key + '=' + value + '&';
        }
        defaults.data = str.substring(0, str.length - 1);
    }
    defaults.method = defaults.method.toUpperCase();
    defaults.cache = defaults.cache ? '' : '&' + new Date().getTime();
    if(defaults.method === 'GET' && (defaults.data || defaults.cache))    defaults.url += '?' + defaults.data + defaults.cache;
    var oXhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
    oXhr.open(defaults.method, defaults.url, defaults.async);
    if(defaults.method === 'GET')
        oXhr.send(null);
    else{
        oXhr.setRequestHeader("Content-type", defaults.contentType);
        oXhr.send(defaults.data);
    }
    oXhr.onreadystatechange = function (){
        if(oXhr.readyState === 4){
            if(oXhr.status === 200)
                defaults.success.call(oXhr, oXhr.responseText);
            else{
                defaults.error();
            }
        }
    }
}

var callUpTimestamp = null;
var waitCallUpTimes = 10000;
var WechatReady = null;
// var urlSearch = window.location.search.replace(/\?/g, "");
var urlSearch = window.location.search;
// 设备放行
var allowRun = function(fn){
    fn=fn||function(){};
    var IP = GetQueryString("gw"),
        MAC = GetQueryString("tid"),
        url = "http://"+IP+"/protocol.csp?fname=net&opt=plug_cgi&function=set&path=/tmp/ipc_path_share&id=0&tid="+MAC;
    if(IP&&MAC){
        ajaxIframe = document.getElementById('ajaxIframe');
        ajaxIframe.setAttribute('src', url);
        ajaxIframe.onload = function(){fn()};
    } else {
        fn();
    }
}
// 获取公众号信息
var weChatRun = function(action){
    waitCallUp();
    action=action||"run";
    AJAX.send({
        url:"http://wifi.wiair.com/api/getinfo.php"+urlSearch+"&action="+action,
        success:function(res){
            res = JSON.parse(res);
            if(res.error != 0){
                wechat_catch(true);
            }else{
                Wechat_GotoRedirect(res.appId,res.extend,res.timestamp,res.sign,res.shopId,res.authUrl,res.mac,res.ssid);
            }
        }
    })
}
// Wechat jsonp
var Wechat_GotoRedirect = function(appId, extend, timestamp, sign, shopId, authUrl, mac, ssid){
    var url = "https://wifi.weixin.qq.com/operator/callWechat.xhtml?appId=" + appId
        + "&extend=" + extend
        + "&timestamp=" + timestamp
        + "&sign=" + sign
        + "&shopId=" + shopId
        + "&authUrl=" + authUrl
        + "&mac=" + mac
        + "&ssid=" + ssid;
    //通过dom操作创建script节点实现异步请求
    var script = document.createElement('script');
    script.setAttribute('src', url);
    document.getElementsByTagName('head')[0].appendChild(script);
}
//注册回调函数
var jsonpCallback = function(result){
    if(result && result.success){
        WechatReady = true;
        document.location = result.data;
    }else{
        // alert(result.data);
        wechat_catch(true);
    }
}
var waitCallUp = function(){
    WechatReady = false;
    callUpTimestamp = setTimeout(wechat_catch,waitCallUpTimes);
}

//异常处理(IOS/放行广告)
var wechat_catch = function(flag){
    if(!navigator.userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/) || flag || !WechatReady){
        document.location = "http://wifi.wiair.com/allow.html"+urlSearch;
    }else {
        var div = document.createElement("div");
        div.innerHTML = "<img src='http://cdn.wiair.com/wifi/img/ios-tips.png'>";
        div.className = "device-box";
        div.id = "ios_tip";
        document.body.appendChild(div);
    }
}

// 获取url参数
var GetQueryString = function(name){
    var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if(r!=null)return  unescape(r[2]); return null;
}

// 意外机型处理
function exceptionTerminal(fn){
    var ua = navigator.userAgent,recheck = GetQueryString("recheck");
    // 三星S7 Android 7.*
    // 魅族MX6 Android 7.1.*
    if(!recheck && ( ua.match(/Android 7.0;.+?SM-G9350/) || ua.match(/Android 7.1.+?MZ-MX6/) ) ){
        document.location = "http://wifi.wiair.com/tips.html"+urlSearch;
    }else {
        fn();
    }

}