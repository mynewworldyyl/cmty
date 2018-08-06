var nodeRequest = require('request');

var FacePP = function (apiKey, apiSecret, options) {
    var defaults, queue, requestCapacity, scheduleRequest;
     var self = this;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    if (options == null) {
        options = {};
    }

    this.sessionCheck = self.sessionCheck.bind(this);

    defaults = {
        apiURL: 'https://apicn.faceplusplus.com/v2',
        sessionInterval: 500,
        requestTimeout: 10 * 1000,
        //设备HTTP请求客户端，我们使用Request代替即可
        //ajaxAdapter: 'FormData' in window ? 'XMLHttpRequest' : 'jQuery',
        ajaxAdapter: 'NodeRequest',
        concurrency: 2
    };
    for (var key in defaults) {
        if (options[key] == null) {
            options[key] = defaults[key];
        }
    }
    this.apiURL = options.apiURL.replace(FacePP.RE_TRIM, '');
    this.sessionInterval = options.sessionInterval;
    this.requestTimeout = options.requestTimeout;

    this.requestAdapter = FacePP.adapter[options.ajaxAdapter];

    if ((requestCapacity = options.concurrency) > 0) {
        queue = [];
        scheduleRequest = function() {
            var apiMethod, callback, data, _ref;
            if (requestCapacity > 0 && queue.length > 0) {
                --requestCapacity;
                _ref = queue.shift(), apiMethod = _ref[0], data = _ref[1], callback = _ref[2];
                FacePP.prototype.request.call(self, apiMethod, data, function(err, resp) {
                    ++requestCapacity;
                    setTimeout(scheduleRequest, 0);
                    callback(err, resp);
                });
            }
        };
        this.request = function(apiMethod, data, callback) {
            queue.push([apiMethod, data, callback]);
            scheduleRequest();
        };
    }
}

FacePP.RE_TRIM = /^\/+|\/+$/g;

FacePP.prototype.request = function(apiMethod, data, callback) {
    var url;
    data['api_key'] = this.apiKey;
    data['api_secret'] = this.apiSecret;
    url = this.apiURL + '/' + (apiMethod.replace(FacePP.RE_TRIM, ''));
    this.requestAdapter(url, data, {
        timeout: this.requestTimeout
    }, callback);
};

FacePP.prototype.sessionCheck = function(session_id, callback) {
    this.request('info/get_session', {
        session_id: session_id
    }, function(err, result) {
        if (err) {
            callback(err, result);
        } else if (result.status === 'FAILED') {
            callback(result.result.error_code || -1, result.result);
        } else if (result.status === 'INQUEUE') {
            setTimeout(self.sessionCheck, self.sessionInterval, session_id, callback);
        } else {
            callback(null, result.result);
        }
    });
};

FacePP.prototype.requestAsync = function(apiMethod, data, callback) {
    data['async'] = 'true';
    this.request(apiMethod, data, function(err, result) {
        if (err) {
            callback(err, result);
        } else {
            setTimeout(self.sessionCheck, self.sessionInterval, result.session_id, callback);
        }
    });
};

FacePP.adapter = {
    jQuery: function(url, data, options, callback) {
        var k, valueLengthEst;
        valueLengthEst = 0;
        for (k in data) {
            valueLengthEst += data[k].length || 0;
        }
        jQuery.ajax({
            url: url,
            dataType: 'jsonp',
            crossDomain: true,
            data: data,
            method: valueLengthEst < 1024 ? 'GET' : 'POST',
            timeout: options.timeout,
            error: function(xhr) {
                var response;
                if ((response = xhr.responseText)) {
                    try {
                        response = JSON.parse(response);
                    } catch (_error) {}
                }
                callback((response != null ? response.error_code : void 0) || -1, response);
            },
            success: function(data) {
                callback(null, data);
            }
        });
    },
    XMLHttpRequest: function(url, data, options, callback) {
        var encode, form, hasBlob, k, tmp, xhr;
        hasBlob = false;
        for (k in data) {
            if (data[k] instanceof Blob) {
                hasBlob = true;
                break;
            }
        }
        xhr = new XMLHttpRequest;
        xhr.onreadystatechange = function() {
            var response;
            if (this.readyState === 4) {
                this.onreadystatechange = null;
                if ((response = this.responseText)) {
                    try {
                        response = JSON.parse(response);
                    } catch (_error) {}
                }
                if (this.status === 200) {
                    callback(null, response);
                } else {
                    callback(response.error_code || -1, response);
                }
            }
        };
        if ('timeout' in xhr) {
            xhr.timeout = options.timeout;
        }
        xhr.open('POST', url, true);
        if (hasBlob) {
            form = new FormData;
            for (k in data) {
                form.append(k, data[k]);
            }
            xhr.send(form);
        } else {
            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            encode = encodeURIComponent;
            tmp = [];
            for (k in data) {
                tmp.push("" + (encode(k)) + "=" + (encode(data[k])));
            }
            xhr.send(tmp.join('&'));
        }
    },

    NodeRequest : function(url, data, options, callback) {
        var valueLengthEst = 0;
        for (var k in data) {
            valueLengthEst += data[k].length || 0;
        }
        nodeRequest({
            url : url,
            method : valueLengthEst < 1024 ? 'GET' : 'POST',
            qs: valueLengthEst < 1024 ? data : '',
            form: valueLengthEst < 1024 ? null : data,
            json:true,
            timeout: options.requestTimeout
        }, function(err,resp,body){
            if(err || resp.statusCode != 200) {
                callback( (err ? err:body), body );
            } else {
                callback(null, body);
            }
        });

    }
};

FacePP.prototype.doRequest = function(path,params,cb) {
    if(!path || path === '') {
        cb('Image URL cannot be null',null);
    }
    if(!cb) {
        cb('Callback method cannot be null',null);
    }
    this.request(path,params,
        function(err, result) {
        if (err) {
            cb(err,null);
        }else {
            cb(null,result);
        }
    });
}

/**
 * 上传图片，并获得face_id
 * @param url
 * @param cb
 */
FacePP.prototype.detDetect = function(url,cb,async,mode) {
    if(typeof async === 'undefined') {
        async = false;
    }
    this.doRequest('detection/detect', {
        url: url,
        async:async,
        mode:mode
    },cb);
}

/**
 * 比较两张脸
 * @param faceOne
 * @param faceTwo
 * @param cb
 */
FacePP.prototype.recCompare = function(faceOne,faceTwo,cb) {
    this.doRequest('recognition/compare', {
        face_id1:faceOne,
        face_id2:faceTwo,
        async:false
    },cb);
}

/**
 * 创建一个人，攻得对应的person_id
 * @param cb
 */
FacePP.prototype.perCreate = function(faceIds, cb) {
    this.doRequest('person/create', {
        face_id:faceIds
    },cb);
}

FacePP.prototype.perAddFace = function(personId,faceIds,cb) {
    this.doRequest('person/add_face', {
        person_id:personId,
        face_id:faceIds
    },cb);
}

FacePP.prototype.perRemoveFace = function(personId,faceIds,cb) {
    this.doRequest('person/remove_face', {
        person_id:personId,
        face_id:faceIds
    },cb);
}

FacePP.prototype.getSessionInfo = function(sessionId,cb) {
    this.doRequest('info/get_session', {
        session_id:sessionId
    },cb);
}

var cfg =  require('../config.js').fnd;

module.exports = new FacePP(cfg.key, cfg.secret, { apiURL : cfg.url });