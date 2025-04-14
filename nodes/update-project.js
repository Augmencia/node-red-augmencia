const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function UpdateProjectNode(config) {
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
              augmenciaServices.projectsService.UpdateProject(msg.payload, metadata, function(err, project) {
                if (err) {
                  reject(err);
                } else {
                  resolve(project);
                }
              })
            }));
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
  RED.nodes.registerType("augmencia-update-project",UpdateProjectNode);
}