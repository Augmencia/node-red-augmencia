const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function SendDataNode(config) {
      RED.nodes.createNode(this,config);
      const node = this;
      const augmenciaServices = RED.nodes.getNode(config.services);
      if (augmenciaServices)
      {
        node.on('input', async function(msg) {
          try
          {
            const metadata = new grpc.Metadata();
            metadata.set('Authorization', `Bearer ${augmenciaServices.credentials.apiKey}`);
            msg.payload = await augmenciaServices.limiter.schedule(() => new Promise(function(resolve, reject) {
              try {
                augmenciaServices.projectsService.SendData(msg.payload, metadata, function(err) {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                })
              }
              catch (err) {
                reject(err)
              }
            }))
            node.send([msg, undefined]);
          } catch (err) {
            msg.payload = err;
            node.send([undefined, msg]);
          }
        });
      }
      else
      {
        node.on('input', function() {
          node.error(config.services + " not found");
        });
      }
  }
  RED.nodes.registerType("augmencia-send-data",SendDataNode);
}