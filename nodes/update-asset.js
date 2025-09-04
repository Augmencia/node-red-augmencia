const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function UpdateAssetNode(config) {
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
                augmenciaServices.projectsService.UpdateAsset(msg.payload, metadata, function(err, asset) {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(asset);
                  }
                });
              }
              catch (err) {
                reject(err)
              }
            }))
            node.send(msg);
          } catch (err) {
            node.error(err, msg);
          }
        });
      }
      else
      {
        node.on('input', function() {
          node.error(config.services + " not found", msg);
        });
      }
  }
  RED.nodes.registerType("augmencia-update-asset",UpdateAssetNode);
}