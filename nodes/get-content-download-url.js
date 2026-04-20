const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function GetContentDownloadUrlNode(config) {
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
            msg.payload = await augmenciaApi.limiter.schedule(() => new Promise(function(resolve, reject) {
              try {
                augmenciaApi.api.GetContentDownloadUrl(msg.payload, metadata, function(err, downloadUrl) {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(downloadUrl.value);
                  }
                })
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
          node.error(config.api + " not found", msg);
        });
      }
  }
  RED.nodes.registerType("augmencia-get-content-download-url",GetContentDownloadUrlNode);
}