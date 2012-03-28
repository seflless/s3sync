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
    history:      'history.json',
    latest:       'HEAD',
    webRoot:      '',
    s3Root:       '',
    include:      [],
    complete:     function(){},
    dir:          ""
  },
  config = {
  };
  
  // Override default option defaults with user supplied ones.
  for(var field in options){
    if(options[field]===undefined){
      config[field] = defaults[field];
    } else {
      config[field] = options[field];
    }
  }

  // Validate options  
  for(var r = 0; r<required.length;r++){
    if(options[required[r]]===undefined){
      console.log(required[r]+' is a required option.');
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
  //  - Also if no options.previous is provided then upload everything (All currently tracked files). 
  
  // Get the list of files changed/updated/deleted based
  // on parameters passed in options
  getFileOperations(config,function(operations){
  
    // Add explicitly included files
    for(var i = 0; i<config.include.length;i++){
      operations.push({
        op: 'A',
        fileName: config.include[i]
      });
    }
  
    // Update the S3 bucket.
    var o = 0;
    function doNext(){
      if(o==operations.length){
        if(config.complete!==undefined){
          config.complete();
        }
        console.log('============Finished Successfully============');
        return;         
      }

      // Do appropriate S3 REST call based on git operation (Add, Delete, and Update)
      var op = operations[o].op,
          fileName = operations[o].fileName.slice(config.webRoot.length);
      if(op=='A'||op=='U'){
        client.putFile(config.dir+operations[o].fileName, config.s3Root+fileName, function(err, res){
          if(err){
            console.log(err);
          } else {
            console.log(fileName+(op=='A'?' added at ':' moved to')+options.bucket+'/'+config.s3Root+fileName);
          }
          o+=1;
          doNext();
        });  
      } else if(op=='D'){

        client.del(config.s3Root+fileName).on('response', function(res){
          //console.log(res.statusCode);
          //console.log(res.headers);
          console.log(fileName+' deleted at '+options.bucket+'/'+config.s3Root+fileName);
          o+=1;
          doNext();
        });
      }
    }
    if(operations.length!=0){
      doNext();
    }
    
    
  });
}

function shouldIgnoreFileName(config,fileName,op){
  // Ignore file names that are equal to "". Bug to look into.
  if(fileName==""){
    return true;
  }

  // Ignore files not in the webRoot folder. (This is
  // because git diff --name-only always returns all files
  // changed between the commits regardless of which subfolder
  // you are in.
  var found = fileName.search(config.webRoot);
  if(found!=0&&config.webRoot!=""){
    //console.log('f: '+fileName);
    //console.log('%s file ignored. Not in webRoot',fileName);
    return true;
  }
  // Ignore directories. They are always submodules.
  // We'll add support for overriding this to include
  // submodule files if we need to reference them
  // publically.
  // Don't check if it was a delete (TODO: Is this correct logic!? Keep an eye on this for logic errors.) 
  if(op!='D'){ 
    
    var stats = fs.lstatSync(config.dir+fileName);
    if(op!='D'&&stats.isDirectory()){
      console.log('%s directory ignored.',fileName);
      return true;
    }
  }
  return false;
}

function getFileOperations(config,cb){
  var operations = [];

  // Call git and get a list of files that have changed since our last sync.
  // or (If no previous commit string was provided)
  // Get all files that tracked at this commit.
  
  if(config.previous!==undefined){
    var gitCommand = 'git diff --name-status '+config.previous+' '+config.latest;
    //console.log(gitCommand);
    //console.log(process.cwd());
    exec('cd '+config.dir+';'+gitCommand, function (error, stdout, stderr) {
      if (error !== null) {
        console.log('Error running git diff:\n' + error);
        console.log('aborting sync');
        process.exit(0);
      }
      
      // Convert git output into an array of file operations.
      // Start by splitting each line of outputted text, then
      // for each line extract the operation and involved fileName.
      var lines = stdout.split('\n');
      for(var l = 0; l<lines.length-1;l++){
        // The first character of the line is the operation (A=Added,D=Deleted,U=Updated)
        var op = lines[l].charAt(0);
        // Extract the fileName
        var fileName = lines[l].slice(2);
        
        // If the fileName/Operation pair meet our requirements
        // then add them to our operations list
        if(!shouldIgnoreFileName(config,fileName,op)){
          operations.push({
            op:op,
            fileName:fileName
          });  
        }
      }
      
      // We're done
      cb(operations);
    });    
  } else {// If no previous was provided then get all tracked files instead
    var gitCommand = 'git ls-files';
    
    process.chdir(config.dir);
    exec(gitCommand, function (error, stdout, stderr) {
      //console.log('----------------------');
      //console.log(stdout);
      //console.log('----------------------');
      if (error !== null) {
        console.log('Error running get tracked files:\n' + error);
        console.log('aborting sync');
        process.exit(0);
      }

      // Convert git output into an array of file operations.
      // Start by splitting each line of outputted text, then
      // for each line extract the operation and involved fileName.      
      var lines = stdout.split('\n');
      for(var l = 0; l<lines.length;l++){
        // The gitput for ls-files is just a list of files so:
        // Copy the line as is into our fileName.
        // Assume it's an add operations as we're adding all the git
        // tracked files to S3
        var op = "A",
            fileName = lines[l];
        
        // If the fileName/Operation pair meet our requirements
        // then add them to our operations list
          
        if(!shouldIgnoreFileName(config,fileName,op)){
          operations.push({
            op:op,
            fileName:fileName
          });  
        }
      }
      
      cb(operations);    
    });    
  }
}

module.exports = s3sync;