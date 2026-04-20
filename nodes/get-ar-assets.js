const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function GetArAssetsNode(config) {
      RED.nodes.createNode(this,config);
      const node = this;
      const augmenciaApi = RED.nodes.getNode(config.api);
      if (augmenciaApi)
      {
        node.on('input', async function(msg) {
          try
          {
            await augmenciaApi.limiter.schedule(() => new Promise((resolve, reject) => {
              const arAssets = [];
              let error = undefined;
              const metadata = new grpc.Metadata();
              metadata.set('Authorization', `Bearer ${augmenciaApi.credentials.apiKey}`);
              augmenciaApi.api.GetARAssets(msg.payload, metadata)
                .on('status', function(status) {
                  if (status.code === 0) {
                    resolve();
                  }
                  else {
                    reject(`Error: Status code ${status.code}`);
                  }
                })
                .on('data', function(arAsset) {
                  arAssets.push(arAsset);
                })
                .on('end', function() {
                  if (!error) {
                    msg.payload = arAssets;
                    node.send(msg);
                    resolve();
                  } else {
                    reject(error);
                  }
                })
                .on('error', function(e) {
                  error = e;
                });
            }))
          }
          catch (err)
          {
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
  RED.nodes.registerType("augmencia-get-ar-assets",GetArAssetsNode);
}