var fs = require('fs'),
    path = require('path'),
    inspect = require('util').inspect,
    child_process = require('child_process'),
    bunyan = require('bunyan'),
    log = bunyan.createLogger({ name: "docklog" }),
    async = require('async'),
    persister = require('./persister.js'),
    parser = require('./parser.js'),
    webServer = require('./web-server.js'),
    sq = require('simplequeue'),
    jobQueue = sq.createQueue();


var importPath = process.env.DOCKLOG_PATH || '../import';
var esUri =  process.env.ESURI || 'http://192.168.99.100:9200';
var webPort =  process.env.WEBPORT || 9400;

log.info('starting application');

async.series([ persister.start, /*startWebServer,*/ startProducer, startConsumer ]);

function startProducer(cb) {
  var watcherProcess = child_process.fork('watcher.js', [ importPath ]);
  watcherProcess.on('message', function(file) {
    log.info('got msg', file);
    jobQueue.putMessage(file);
  });
  cb(null);
}

function startConsumer() {
  var msg = jobQueue.getMessageSync();
        
  if (msg != null) {
    log.info('processing file %s', msg);
    parser.processFile(msg);
    setTimeout(startConsumer, 1);
  }
  else {
    setTimeout(startConsumer, 1000);
  }
}

function startWebServer(cb) {
  webServer.start(webPort);
  cb(null);
}
