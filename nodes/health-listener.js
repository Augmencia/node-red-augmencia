const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function HealthListenerNode(config) {
    RED.nodes.createNode(this,config);
    const node = this;
    const augmenciaServices = RED.nodes.getNode(config.services);
    if (augmenciaServices)
    {
      let stream;
      let timeout;
      let isClosed = false;
      const metadata = new grpc.Metadata();
      metadata.set('Authorization', `Bearer ${augmenciaServices.credentials.apiKey}`);
      (function subscribeToHealth() {
        stream = undefined;
        augmenciaServices.limiter.schedule(() => new Promise((resolve, reject) => {
          if (isClosed) {
            resolve();
            return;
          }
          node.status({fill:'grey',shape:'ring',text:'node-red:common.status.connecting'})
          stream = augmenciaServices.health.projectsService.Watch({service: ''})
            .on('data', function({status}) {
              if (!isClosed) {
                node.send({
                  payload: status
                });
                node.status({fill:'green',shape:'dot',text:'node-red:common.status.connected'})
              }
              resolve();
            })
            .on('end', function() {
              if (!isClosed) {
                node.status({fill:'red',shape:'ring',text:'node-red:common.status.disconnected'});
                timeout = setTimeout(subscribeToHealth, 5000);
              }
              resolve()
            })
            .on('error', function(e) {
              if (!isClosed) {
                node.error(e);
              }
            });
        }))
      })();
      node.on('close', function() {
        isClosed = true;
        stream?.cancel();
        if (timeout) {
          clearTimeout(timeout);
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
  
  RED.nodes.registerType("augmencia-health-listener", HealthListenerNode);
}