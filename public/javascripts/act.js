//var dc = require('./dc.js');

var fieldNames = ['actId','nickName','email','officePhone','homePhone','addrLine1','description','remark'];

dc = dc || {};

dc.act = {};

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

//module.exports = dc;