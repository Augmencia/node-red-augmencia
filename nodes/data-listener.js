const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function DataListenerNode(config) {
    RED.nodes.createNode(this,config);
    const node = this;
    const augmenciaServices = RED.nodes.getNode(config.services);
    if (augmenciaServices)
    {
      node.status({fill:'red',shape:'ring',text:'node-red:common.status.disconnected'});
      const streams = [];
      function stopStream(stream) {
        if (stream.stream)
        {
          stream.stream.cancel();
          delete stream.stream;
        }
        if (stream.timeout) {
          clearTimeout(stream.timeout);
          delete stream.timeout;
        }
      }
      let streamsCpt = 0;
      node.on('input', async function(msg) {
        const stream = {
          number : streamsCpt
        }
        const projectId = msg.payload;
        streamsCpt = streamsCpt + 1;
        streams.push(stream);
        const metadata = new grpc.Metadata();
        metadata.set('Authorization', `Bearer ${augmenciaServices.credentials.apiKey}`);
        (async function subscribeToData() {
          stopStream(stream);
          await augmenciaServices.limiter.schedule(() => new Promise((resolve, reject) => {
            streams
            node.status({fill:'green',shape:'dot',text:'node-red:common.status.connected'})
            stream.stream = augmenciaServices.projectsService.RegisterToData({value: projectId}, metadata)
              .on('status', function(status) {
                if (status.code === 3)
                {
                  const idx = streams.indexOf(stream);
                  if (idx >= 0) {
                    streams.splice(idx, 1);
                    stopStream(stream);
                  }
                }
              })
              .on('data', function(ev) {
                msg.payload = ev.value;
                node.send(msg);
                resolve();
              })
              .on('end', function() {
                if (streams.indexOf(stream) >= 0) {
                  stream.timeout = setTimeout(subscribeToData, 5000);
                }
                if (streams.length <= 0) {
                  node.status({fill:'red',shape:'ring',text:'node-red:common.status.disconnected'});
                }
                resolve()
              })
              .on('error', function(e) {
                if (streams.indexOf(stream) >= 0) {
                  node.error(e);
                }
              });
            setTimeout(resolve, 1000);
          }))
        })();
      })
      node.on('close', function() {
        for (let stream = streams.pop(); stream; stream = streams.pop()) {
          stopStream(stream);
        }
        node.status({fill:'red',shape:'ring',text:'node-red:common.status.disconnected'});
      });
    }
    else
    {
      node.on('input', function() {
        node.error(config.services + " not found");
      });
    }
  }
  
  RED.nodes.registerType("augmencia-data-listener", DataListenerNode);
}