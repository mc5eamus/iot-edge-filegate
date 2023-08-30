const Transport = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').ModuleClient;
const Message = require('azure-iot-device').Message;
const chokidar = require('chokidar');
const fs = require('fs');
const moment = require('moment');

Client.fromEnvironment(Transport, function (err, client) {
  if (err) {
    throw err;
  } else {
    client.on('error', function (err) {
      throw err;
    });

    const mediaPath = process.env.OBSERVABLE_PATH
    const interval = parseInt(process.env.INTERVAL) || 5000;

    console.log('setting up chokidar for ' + mediaPath);
    const watcher = chokidar.watch(mediaPath, {persistent: true, usePolling: true});

    watcher
      .on('add', function(path) {
        console.log('File', path, 'has been added');
        
        // if anything is added to /optec/out, log and delete it
        if (path.indexOf(mediaPath + '/out/')==0) {
          console.log('File', path, 'has been added to optec/out');        
          fs.readFile(path, 'utf8' , (err, data) => {
            if (err) {
              console.error(err)
              return
            }
            console.log("Message content: " + data)
            fs.unlink(path, (err) => {
              if (!err) console.log('File', path, 'removed');
            });
          })
        }
      });

    console.log('setting up simulated file generation every ' + interval + 'ms');
    setInterval(() => {
      //save a file with a random number to /optec/in every 5 seconds
      var outfile = moment(new Date()).format("yyyy-mm-DD-hh-MM-ss") + ".txt";
      var data = Math.random(); // override for your preferred mock content
      // write the file to the /optec/in folder so it will be picked up by the module
      fs.writeFile(mediaPath + '/in/' + outfile, data, function (err) {
        if (err) throw err;
        console.log('Generated a simulated ' + outfile);
      });
    }, interval);
  }
});

