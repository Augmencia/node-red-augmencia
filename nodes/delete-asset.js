const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function DeleteAssetNode(config) {
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
            await augmenciaServices.limiter.schedule(() => new Promise(function(resolve, reject) {
              augmenciaServices.projectsService.DeleteAsset(msg.payload, metadata, function(err, _) {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              })
            }));
            msg.payload = undefined;
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
  RED.nodes.registerType("augmencia-delete-asset",DeleteAssetNode);
}