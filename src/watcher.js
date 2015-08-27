var chokidar = require('chokidar'),
    bunyan = require('bunyan'),
    log = bunyan.createLogger({ name: "watcher" });

var importPath = process.argv[2];
if (!importPath) throw new Error('no path');
log.info('watching folder %s', importPath);

var watcher = chokidar.watch(importPath, { ignored: /[\/\\]\./, persistent: true });

 
watcher
  .on('add', function(path) {
    log.debug('file', path);
    process.send(path);
  });
