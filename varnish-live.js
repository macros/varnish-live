var sys = require("sys"),
    request = require("request"),
    http = require("http"),  
    url = require("url"),
    io = require('socket.io'),
    path = require("path"),
    fs = require("fs");


var metrics = 0;

var server = require('http').createServer(function(req, response){
    var uri = url.parse(req.url).pathname;  
    var filename = path.join(process.cwd(), uri);
    path.exists(filename, function(exists) {
        if(!exists) {
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.write("404 Not Found\n");
            response.end();
            return;
        }
        
        fs.readFile(filename, "binary", function(err, file) {
            if(err) {
                response.writeHead(500, {"Content-Type": "text/plain"});
                response.write(err + "\n");
                response.end();
                return;
            }
            
            response.writeHead(200);
            response.write(file, "binary");
            response.end();
        });
    });
});
server.listen(8080);

function increase_metric() {
    metrics = metrics + 1;
};

setInterval(increase_metric, 1000);
// socket.io 
var socket = io.listen(server); 
socket.on('connection', function(client){ 
    client.send(metrics);

}); 
function send_metric() {
    socket.broadcast(metrics);
};
setInterval(send_metric,1000);