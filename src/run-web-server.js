var webServer = require('./web-server.js'),
    bunyan = require('bunyan'),
    log = bunyan.createLogger({ name: "docklog" });

var importPath = process.env.DOCKLOG_PATH || '../import';
var esUri =  process.env.ESURI || 'http://192.168.99.100:9200';
var webPort =  process.env.WEBPORT || 9400;

log.info('starting application');

webServer.start(webPort);
