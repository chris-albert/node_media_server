var Creasetoph = {
    _debug: true,
    _FS: require('fs'),
    _UTIL: require('util'),
    _PATH: require('path'),
    Server: {
        _instance: null,
        _HTTP: require('http'),
        port: 1338,
        start: function() {
            self = this;
            _instance = this._HTTP.createServer(function(req,res) {
                self.routeRequest(req,res);
            }).listen(this.port);
            Creasetoph.debug("Server started at port: " + this.port);
        },
        parseUrl: function(url) {
            var parts = url.split('/');
            parts.shift();
            return parts;
        },
        routeRequest: function(request,response) {
            var url_parts = this.parseUrl(request.url),
                controller = this.findController(url_parts[0]),
                action = this.findAction(controller,url_parts[1]);
            request.url_parts = url_parts;
            if(typeof action === "function") {
                return action.call(controller,request,response);
            }
            return "Could not route request!";
                      
        },
        findController: function(controller) {
            if(typeof Creasetoph.Controllers[controller] !== "undefined") {
                return Creasetoph.Controllers[controller];
            }
            return null;
        }, 
        findAction: function(controller,action) {
            if(controller === null) return null;
            if(typeof controller[action] !== "undefined") {
                return controller[action];
            }
            return null;
        }
    },
    Controllers: {
        music: {
            _root: "/media/data/Music",
            recursiveReadDir: function(directory) {
                var getFiles = function(dir) {
                    var file_obj = {},
                        files = Creasetoph._FS.readdirSync(dir)
                    files.forEach(function(file) {
                        try {
                            var name = dir + '/' + file,
                                stats = Creasetoph._FS.statSync(name);
                            if(stats && stats.isDirectory()) {
                                file_obj[file] = getFiles(name);
                            }else {
                                file_obj[file] = 'file';
                            }
                        }catch(e) {
                            Creasetoph.debug("Could not find file: " + name);
                        }
                    });
                    return file_obj;
                };
                return getFiles(directory);
            },
            json: function(req,res) {
                res.writeHead(200,{'content-type': 'text/plain'});
                var files = this.recursiveReadDir(this._root);
                res.end(JSON.stringify(files));
            },
            stream: function(req,res) {
                var url = req.url_parts.splice(2).join('/'),
                    path = decodeURIComponent(this._root + '/' + url),
                    stat;
                try {
                    stat = Creasetoph._FS.statSync(path);
                    //res.writeHead(200,{'content-type': 'text/plain'});
                    //res.end(path);
                
                    res.writeHead(200,{
                        'Content-Type'  : 'audio/mpeg',
                        'Content-Length': stat.size
                    });
                    var readStream = Creasetoph._FS.createReadStream(path);
                    Creasetoph._UTIL.pump(readStream,res);
                    
                }catch(e) {
                    Creasetoph.debug(e.name + ': ' + e.message);
                }
            }       
        },
        video: {
            _root: "/media/data/Videos",
            _content_map: {
                'mov': 'video/quicktime',
                'wmv': 'x-ms-wmv',
                'mpg': 'video/mpeg',
                'avi': 'video/x-msvideo',
                'flash': 'application/x-shockwave-flash'
            },
            findContentType: function(ext) {
                if(typeof this._content_map[ext] !== "undefined") {
                    return this._content_map[ext];
                }      
                return this._content_map.flash;
            },
            stream: function(req,res) {
                var url = req.url_parts.splice(2).join('/'),
                    path = decodeURIComponent(this._root + '/' + url),
                    ext = Creasetoph._PATH.extname(path).substr(1),
                    content_type = this.findContentType(ext),
                    stat;
                try {
                    stat = Creasetoph._FS.statSync(path);
                    /*
                    res.writeHead(200,{'content-type': 'text/plain'});
                    var out = "path: " + path + '\n';
                    out += "ext: " + ext + "\n";
                    out += "content type: " + content_type + "\n";
                    res.end(out);
                    */
                    res.writeHead(200,{
                        'Content-Type'  : content_type,
                        'Content-Length': stat.size
                    });
                    var readStream = Creasetoph._FS.createReadStream(path);
                    Creasetoph._UTIL.pump(readStream,res);
                    
                }catch(e) {
                    Creasetoph.debug(e.name + ': ' + e.message);
                }
            }     
        }
    },
    init: function() {
        this.Server.start();
    },
    debug: function(str) {
        if(this._debug) {
            if(typeof str === "object") {
                str = JSON.stringify(str);
            }
            console.log(str);       
        }
    }

};
Creasetoph.init();
