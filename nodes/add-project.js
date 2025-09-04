const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function AddProjectNode(config) {
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
                const callback = function(err, project) {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(project);
                  }
                };
                if (augmenciaServices.apiKeyPayload.organizationId) {
                  const request = {...msg.payload, organizationId: augmenciaServices.apiKeyPayload.organizationId};
                  augmenciaServices.projectsService.AddOrganizationProjectAsync(request, metadata, callback)
                } else {
                  augmenciaServices.projectsService.AddUserProject(msg.payload, metadata, callback)
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
          node.error(config.services + " not found", msg);
        });
      }
  }
  RED.nodes.registerType("augmencia-add-project",AddProjectNode);
}