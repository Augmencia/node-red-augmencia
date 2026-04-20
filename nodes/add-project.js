const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function AddProjectNode(config) {
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
                const callback = function(err, project) {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(project);
                  }
                };
                if (augmenciaApi.apiKeyPayload.sub.startsWith('organization:')) {
                  const request = {...msg.payload, organization_id: augmenciaApi.apiKeyPayload.sub.substring('organization:'.length)};
                  augmenciaApi.api.AddOrganizationProjectAsync(request, metadata, callback)
                } else {
                  console.log(msg.payload)
                  augmenciaApi.api.AddUserProject(msg.payload, metadata, callback)
                }
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
  RED.nodes.registerType("augmencia-add-project",AddProjectNode);
}