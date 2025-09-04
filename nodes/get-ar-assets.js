const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function GetArAssetsNode(config) {
      RED.nodes.createNode(this,config);
      const node = this;
      const augmenciaServices = RED.nodes.getNode(config.services);
      if (augmenciaServices)
      {
        node.on('input', async function(msg) {
          try
          {
            await augmenciaServices.limiter.schedule(() => new Promise((resolve, reject) => {
              const arAssets = [];
              let error = undefined;
              const metadata = new grpc.Metadata();
              metadata.set('Authorization', `Bearer ${augmenciaServices.credentials.apiKey}`);
              augmenciaServices.projectsService.GetARAssets(msg.payload, metadata)
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
          node.error(config.services + " not found", msg);
        });
      }
  }
  RED.nodes.registerType("augmencia-get-ar-assets",GetArAssetsNode);
}