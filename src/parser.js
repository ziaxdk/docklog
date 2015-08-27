module.exports.processFile = processFile;

var fs = require('fs'),
    http = require('http'),
    path = require('path'),
    inspect = require('util').inspect,
    bunyan = require('bunyan'),
    log = bunyan.createLogger({ name: "parser" }),
    async = require('async'),
    eventstream = require('event-stream'),
    WritableBulk = require('elasticsearch-streams').WritableBulk,
    TransformToBulk = require('elasticsearch-streams').TransformToBulk,

    persister = require('./persister.js');


var importPath = process.env.DOCKLOG_PATH || '../import';
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

function processFile(file, cb) {
  log.info('start processing \'%s\'', path.join(importPath, file));

  var done = function() {
    log.info('done processing \'%s\'', path.join(importPath, file));
  };

  var dest = persister.getPersister(done);

  var f = fs.createReadStream(path.join(importPath, file));
  f.pipe(eventstream.split())
   .pipe(eventstream.map(map))
   // .pipe(eventstream.map(dumpDebug))
   .pipe(dest.bulkFn)
   .pipe(dest.stream);
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
