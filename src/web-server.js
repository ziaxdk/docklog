var HttpServer = require('http-server'),
    child_process = require('child_process'),
    bunyan = require('bunyan'),
    log = bunyan.createLogger({ name: "parser" });



var start = function() {
  var proc = child_process.spawn('node', ['node_modules\\http-server\\bin\\http-server', './sense', '-p', '9400'] );
  proc.stdout.on('data', function (data) {
    log.info('webserver: ' + data);
  });
};

module.exports.start = start;