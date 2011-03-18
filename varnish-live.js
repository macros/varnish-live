var sys = require("sys"),
    request = require("request"),
    http = require("http"),
    url = require("url"),
    io = require('socket.io'),
    path = require("path"),
    events = require('events'),
    fs = require("fs");

var last_hits = 0;
var last_misses = 0;
var last_total = 0;

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
server.listen(5000);

var metrics_emitter = new events.EventEmitter();
var riak = require('riak-js').getClient();

function get_metrics() {
    var current_hits = 0;
    var current_misses = 0;
    var metrics = {};
    var second = String(new Date().getSeconds());
    riak.walk('varnishstat-rb-list', second, [['_','varnishstat-second', '1']], function(err, data) {
            data[1].forEach(function(metric) {
                    current_misses = current_misses + metric.cache_miss;
                    current_hits = current_hits + metric.cache_hit;
                });
            var current_total = current_hits + current_misses;
            if(last_total > 0) {
                var rate_hits = current_hits - last_hits;
                var rate_misses = current_misses - last_misses;
                var rate_total = current_total - last_total;
                if(rate_total > 0) {
                    metrics['total'] = rate_total;
                    metrics['hits'] = rate_hits;
                    metrics['misses'] = rate_misses;
                    metrics_emitter.emit("metrics", metrics);
                }
            }
            last_total = current_total;
            last_hits = current_hits;
            last_misses = current_misses;
        })
        }

setInterval(get_metrics, 1000);

var listener = metrics_emitter.addListener("metrics", function(metrics) {
        send_metric(metrics);
});

var socket = io.listen(server);
function send_metric(metrics) {
    socket.broadcast(metrics);
}
