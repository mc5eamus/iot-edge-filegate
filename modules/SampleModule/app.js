'use strict';
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
    console.log('setting up chokidar for ' + mediaPath);
    var watcher = chokidar.watch(mediaPath, {persistent: true, usePolling: true});

    watcher
      .on('add', function(path) {
        console.log('File', path, 'has been added');
        
        if (path.indexOf(mediaPath + '/in/')==0) {
          console.log('File', path, 'has been added to optec/in');
          // there's something we need to send to the cloud
          fs.readFile(path, 'utf8' , (err, data) => {
            if (err) {
              console.error(err)
              return
            }
            console.log("Attempting to send "+data);
            var outputMsg = new Message(data);

            // some optional properties to facilitate processing
            outputMsg.properties.add('message-type', 'optec in');
            outputMsg.properties.add('filename', path);

            // send the message to an output, the route will take care of the rest
            client.sendOutputEvent('output1', outputMsg).then(() => {
              console.log('Message from ' + path + ' sent');
              // we're done and can delete the file
              fs.unlink(path, (err) => {
                if (!err) console.log('File', path, 'has been deleted after transmissting');
              });

            });
          })
        }

      })
      .on('unlink', function(path) {console.log('watcher: ', path, 'has been removed');})
      .on('error', function(error) {console.error('watcher / something happened: ', error);})
    
    // connect 
    client.open(function (err) {
      if (err) {
        throw err;
      } else {
        console.log('IoT Hub module client initialized');

        // establish callback for "optec_out" module direct calls
        client.onMethod("optec_out", (request, response) => {
          const outfile = moment(new Date()).format("yyyy-mm-DD-hh-MM-ss") + ".txt";
          // the payload is the content of the file to be written,
          // feel free to adjust it to your needs
          const outfileContent = request.payload;

          fs.writeFile(mediaPath + '/out/' + outfile, outfileContent, err => {
            if (err) {
              console.error(err);
            }
            console.log("File " + outfile + " created");
          });

          // we pass the name of the outfile back to the caller
          // for troubleshooting purposes
          response.send(200, outfile)
        });
      }
    });
  }
});
