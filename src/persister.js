module.exports.start = start;
module.exports.close = close;
module.exports.getPersister = getPersister;

var fs = require('fs'),
    http = require('http'),
    path = require('path'),
    inspect = require('util').inspect,
    child_process = require('child_process'),
    bunyan = require('bunyan'),
    log = bunyan.createLogger({ name: "persister" }),
    async = require('async'),
    eventstream = require('event-stream'),
    elasticsearch = require('elasticsearch'),
    WritableBulk = require('elasticsearch-streams').WritableBulk,
    TransformToBulk = require('elasticsearch-streams').TransformToBulk,
    chokidar = require('chokidar'),
    sq = require('simplequeue'),
    jobQueue = sq.createQueue(),

    HttpServer = require('http-server');

var importPath = process.env.DOCKLOG_PATH || '../import';
var esUri =  process.env.ESURI || 'http://192.168.99.100:9200';
var counter = 0;
var buffer = [];
var client;


function start(cb) {
  client = new elasticsearch.Client({ host: esUri, log: 'error' });
  log.debug('starting persister');
  async.series([ checkEs, ensureIndex ], function(err, res) {
    if (err) return cb(err);
    cb(null, res);
  });

}

function checkEs(cb) {

  async.retry({ times: 50, interval: 1 }, function(callback, results) {
    log.info('checking host %s', esUri);
    
    http.get(esUri, function(res) {
      callback(null, res);
    }).on("error", function(e) {
      callback(e);
    });
  },
  function(err, result) {
    if (err) cb(err);
    cb(null, result);
  });


  // check(esUri, function(err, res) {
  //   if (err) return cb(err);
  //   cb(null);
  // });
}

function getPersister(cb) {
  var bulkExec = function(bulkCmds, callback) {
    client.bulk({
      index : 'docklog',
      type  : 'log',
      body  : bulkCmds
    }, callback);
  };

  var ws = new WritableBulk(bulkExec);
   ws.on('close', cb);

  return {
    bulkFn: new TransformToBulk(function(doc) { return { }; }),
    stream: ws
  };
}

function close() {
  log.debug('stopping persister');
  client.close();
}

function lineParseFn(k, v) {
  var expr = '(' + k + ': )|(' + k + ' - )';
  return v && v.replace(new RegExp(expr, 'i'), '');
}

function map(data, cb) {
  if (!data) {
    var logItem = {};
    
    for (var i = 0; i < labels.length; i++) {
      var label = labels[i];
      var name = Object.keys(label)[0];
      var fn = label[name];
      logItem[name.toLowerCase()] = fn(name, buffer[i]);
    }
    buffer = [];
    ++counter;
    return cb(null, logItem);
  }
  buffer.push(data);
  cb();
}

function dumpDebug(data, cb) {
  log.info(inspect(data));
  cb(null, data);
}

function ensureIndex(cb) {
  log.info('ensure index docklog');
  client.indices.exists({
    index: 'docklog'
  }, function (error, exists) {
    if (exists) return cb();
    createIndex(cb);
  });
}

function createIndex(cb) {
  log.info('creating index & mapping \'docklog\'');

  var logSetup = {
    "settings": {
      "index" : {
        "number_of_replicas": 0,
        "number_of_shards": 1
      }
    },

    "mappings": {

      "station" : {
        "dynamic": "strict",

        "properties" : {
          "timestamp": {
            "type": "date",
            "format": "dd-MM-yyyy HH:mm:ss"
          },
          "message": {
            "type": "string"
          },
          "category": {
            "type": "string"
          },
          "machine": {
            "type": "string"
          },
          "app domain": {
            "type": "string"
          },
          "processid": {
            "type": "integer"
          },
          "process name": {
            "type": "string"
          },
          "thread name": {
            "type": "string"
          },
          "win32 threadid": {
            "type": "integer"
          },
          "extended properties": {
            "type": "string"
          },
          "typename": {
            "type": "string"
          },
          "typemembername": {
            "type": "string"
          },
          "threadprincipal": {
            "type": "string"
          },
          "processuser": {
            "type": "string"
          }
        }
      }
    }
  };

  client.indices.create({ index: 'docklog', body: logSetup }, function(err, resp) {
    if (err) throw err;
    cb();
  });
}
