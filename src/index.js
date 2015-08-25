var fs = require('fs'),
    path = require('path'),
    inspect = require('util').inspect,
    bunyan = require('bunyan'),
    log = bunyan.createLogger({ name: "docklog" }),
    async = require('async'),
    eventstream = require('event-stream'),
    elasticsearch = require('elasticsearch'),
    WritableBulk = require('elasticsearch-streams').WritableBulk,
    TransformToBulk = require('elasticsearch-streams').TransformToBulk,

    CheckHost = require('./checkHost'),
    HttpServer = require('http-server');

var importPath = process.env.DOCKLOG_PATH || '../import';
var esUri =  process.env.ESURI || 'http://192.168.99.100:9200';
var counter = 0;
var labels = [ { 'Timestamp': lineParseFn },
               { 'Message': lineParseFn },
               { 'Category': lineParseFn },
               { 'Machine': lineParseFn },
               { 'App Domain': lineParseFn },
               { 'ProcessId': lineParseFn },
               { 'Process Name': lineParseFn },
               { 'Thread Name': lineParseFn },
               { 'Win32 ThreadId': lineParseFn },
               { 'Extended Properties': lineParseFn },
               { 'typeName': lineParseFn },
               { 'typeMemberName': lineParseFn },
               { 'threadPrincipal': lineParseFn },
               { 'processUser': lineParseFn }
              ];
var buffer = [];

var client = new elasticsearch.Client({ host: esUri, log: 'error' });

async.series([ checkEs, ensureIndex, processFiles ], function() {
  log.info('Done. Inserted %s entries', counter);
  client.close();
});

function checkEs(cb) {
  CheckHost(esUri, function(err, res) {
    if (err) return cb(err);
    cb(null);
  });
}

function processFiles(cb) {
  var files = fs.readdirSync(importPath);
  log.info('Getting files from \'%s\' - found %s file(s)', importPath, files.length);
  async.eachSeries(files, processFile, cb);
}

function processFile(file, cb) {
  log.info('Processing \'%s\'', path.join(importPath, file));

  var bulkExec = function(bulkCmds, callback) {
    client.bulk({
      index : 'docklog',
      type  : 'log',
      body  : bulkCmds
    }, callback);
  };
  var ws = new WritableBulk(bulkExec);
  ws.on('close', cb);
  // var toBulk = new TransformToBulk(function(doc) { return { _id: doc.id }; });
  var toBulk = new TransformToBulk(function(doc) { return { }; });

  var f = fs.createReadStream(path.join(importPath, file));
  f.pipe(eventstream.split())
   .pipe(eventstream.map(map))
   .pipe(toBulk)
   .pipe(ws);
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

// function index(data, cb) {
//   client.index({
//     index: 'docklog',
//     type: 'log',
//     body: data
//   }, function (error, response) {
//     if (error) return cb(error);
//     cb(null);
//   });
// }

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
