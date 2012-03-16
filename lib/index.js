var knox = require('knox');
    fs = require('fs'),
    exec = require('child_process').exec,
    util = require('util');

// The big kahuna function
var s3sync = function(options){
  
  var required = [
    'amazonKey',
    'amazonSecret',
    'bucket',
    'gitRoot'
  ];
  defaults = {
    history:      "history.json",
    latest:       "HEAD",
    localRoot:    "",
    s3Root:       ""
  },
  config = {
  };
  
  // Override default option defaults with user supplied ones.
  for(var field in options){
    config[field] = options[field];
  }
  
  var dir = config.gitRoot+config.localRoot;

  // Validate options  
  
  for(var r = 0; r<required.length;r++){
    if(options[required[r]]===undefined){
      console.log(required[r]+" is a required option.");
      return;
    }
  }
  
  console.log('============Syncing local with S3============');
  

  // Setup knox with our S3 credentials
  var client = knox.createClient({
    key:    options.amazonKey,
    secret: options.amazonSecret,
    bucket: options.bucket
  });
  
  //  - Load the sync history .json file if it's available.
  //  - If the file exist use the last sync commit hash.
  //  - If it doens't exist sync all files. Then create and store the history
  //    file for next time.
  //  - Also if no options.previous is provided then upload everything. 
  
  // Call git and get a list of files that have changed since our last sync
  // or all files if there has never been a sync
  exec("cd "+dir+";git diff --name-only "+config.latest+" "+config.previous, function (error, stdout, stderr) {
    // util.print('stdout: \n' + stdout);
    if (error !== null) {
      console.log('Error running git diff:\n' + error);
      console.log('aborting sync');
      process.exit(0);
    }
    
    // Extract all file names into an array
    var files = stdout.split("\n");
    // Go through all the files, filtering out directories
    for(var f = 0; f<files.length-1;f++){
      // Ignore files not in the localRoot folder. (This is
      // because git diff --name-only always returns all files
      // changed between the commits regardless of which subfolder
      // you are in.
      var found = files[f].search(config.localRoot);
      if(found!==0){
        //console.log(files[f]);
        //console.log('%s file ignored. Not in localRoot',files[f]);
        continue;
      }
      var s3Filename = files[f].slice(config.localRoot.length);
      
      // Ignore directories. They are always submodules.
      // We'll add support for overriding this to include
      // submodule files if we need to reference them
      // publically 
      var stats = fs.lstatSync(dir+s3Filename);
      if(stats.isDirectory()){
        //console.log('%s directory ignored.',files[f]);
        continue;
      }
      (function(file){
        client.putFile(dir+files[file], config.s3Root+files[file], function(err, res){
          console.log('%s -> '+'%s/', files[file],options.bucket+config.s3Root+s3Filename);
        }); 
      })(f);
    }
  });
}

module.exports = s3sync;
