const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function DeleteArAssetNode(config) {
      RED.nodes.createNode(this,config);
      const node = this;
      const augmenciaApi = RED.nodes.getNode(config.api);
      if (augmenciaApi)
      {
        node.on('input', async function(msg) {
          try
          {
            const metadata = new grpc.Metadata();
            metadata.set('Authorization', `Bearer ${augmenciaApi.credentials.apiKey}`);
            await augmenciaApi.limiter.schedule(() => new Promise(function(resolve, reject) {
              augmenciaApi.api.DeleteARAsset(msg.payload, metadata, function(err, _) {
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
          node.error(config.api + " not found", msg);
        });
      }
  }
  RED.nodes.registerType("augmencia-delete-ar-asset",DeleteArAssetNode);
}