var HttpServer = require('http-server'),
    child_process = require('child_process'),
    bunyan = require('bunyan'),
    log = bunyan.createLogger({ name: "parser" }),
    Path = require('path');



var start = function() {
  var path = Path.join('node_modules', 'http-server', 'bin', 'http-server');
  var proc = child_process.spawn('node', [ path, './sense', '-p', '9400' ] );
  proc.stdout.on('data', function (data) {
    log.info('webserver: ' + data);
  });
};

module.exports.start = start;