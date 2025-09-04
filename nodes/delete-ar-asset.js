const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function DeleteArAssetNode(config) {
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
              augmenciaServices.projectsService.DeleteARAsset(msg.payload, metadata, function(err, _) {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              })
            }));
            msg.payload = undefined;
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
  RED.nodes.registerType("augmencia-delete-ar-asset",DeleteArAssetNode);
}