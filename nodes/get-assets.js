const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function GetAssetsNode(config) {
      RED.nodes.createNode(this,config);
      const node = this;
      const augmenciaApi = RED.nodes.getNode(config.api);
      if (augmenciaApi)
      {
        node.on('input', async function(msg) {
          try
          {
            await augmenciaApi.limiter.schedule(() => new Promise((resolve, reject) => {
              const assets = [];
              let error = undefined;
              const metadata = new grpc.Metadata();
              metadata.set('Authorization', `Bearer ${augmenciaApi.credentials.apiKey}`);
              augmenciaApi.api.GetAssetsFromProject({value: msg.payload}, metadata)
                .on('status', function(status) {
                  if (status.code === 0) {
                    resolve();
                  }
                  else {
                    reject(`Error: Status code ${status.code}`);
                  }
                })
                .on('data', function(asset) {
                  assets.push(asset);
                })
                .on('end', function() {
                  if (!error) {
                    msg.payload = assets;
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
  RED.nodes.registerType("augmencia-get-assets",GetAssetsNode);
}