const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function EventsListenerNode(config) {
    RED.nodes.createNode(this,config);
    const node = this;
    const augmenciaApi = RED.nodes.getNode(config.api);
    if (augmenciaApi)
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
        const payload = {...msg.payload, organizations: false};
        streamsCpt = streamsCpt + 1;
        streams.push(stream);
        const metadata = new grpc.Metadata();
        metadata.set('Authorization', `Bearer ${augmenciaApi.credentials.apiKey}`);
        (async function subscribeToEvents() {
          stopStream(stream);
          await augmenciaApi.limiter.schedule(() => new Promise((resolve, reject) => {
            try {
              node.status({fill:'green',shape:'dot',text:'node-red:common.status.connected'})
              stream.stream = augmenciaApi.api.RegisterToEvents(payload, metadata)
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
                  msg.payload = ev;
                  node.send(msg);
                  resolve();
                })
                .on('end', function() {
                  if (streams.indexOf(stream) >= 0) {
                    stream.timeout = setTimeout(subscribeToEvents, 5000);
                  }
                  if (streams.length <= 0) {
                    node.status({fill:'red',shape:'ring',text:'node-red:common.status.disconnected'});
                  }
                  resolve()
                })
                .on('error', function(e) {
                  if (streams.indexOf(stream) >= 0) {
                    node.error(e, msg);
                  }
                });
              setTimeout(resolve, 1000);
            }
            catch (err)
            {
              node.error(err, msg)
            }
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
        node.error(config.api + " not found");
      });
    }
  }
  
  RED.nodes.registerType("augmencia-events-listener", EventsListenerNode);
}