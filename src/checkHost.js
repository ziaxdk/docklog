var http = require('http'),
    async = require('async'),
    bunyan = require('bunyan'),
    log = bunyan.createLogger({ name: "docklog" });

function check(uri, cb) {
  async.retry({ times: 50, interval: 1 }, function(callback, results) {
    log.info('checking host %s', uri);
    
    http.get(uri, function(res) {
      callback(null, res);
    }).on("error", function(e) {
      callback(e);
    });
  },
  function(err, result) {
    if (err) cb(err);
    cb(null, result);
  });
}

module.exports = check;