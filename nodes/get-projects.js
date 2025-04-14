const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function GetProjectsNode(config) {
      RED.nodes.createNode(this,config);
      const node = this;
      const augmenciaServices = RED.nodes.getNode(config.services);
      if (augmenciaServices)
      {
        node.on('input', async function(msg) {
          await augmenciaServices.limiter.schedule(() => new Promise((resolve, reject) => {
            const projects = [];
            let error = undefined;
            const metadata = new grpc.Metadata();
            metadata.set('Authorization', `Bearer ${augmenciaServices.credentials.apiKey}`);
            augmenciaServices.projectsService.GetProjects({}, metadata)
              .on('status', function(status) {
                if (status.code === 0) {
                  resolve();
                }
                else {
                  reject(`Error: Status code ${status.code}`);
                }
              })
              .on('data', function(project) {
                projects.push(project);
              })
              .on('end', function() {
                if (!error) {
                  msg.payload = projects;
                  node.send([msg, undefined]);
                  resolve();
                } else {
                  msg.payload = error;
                  node.send([undefined, msg]);
                  reject(error);
                }
              })
              .on('error', function(e) {
                error = e;
              });
          }))
        });
      }
      else
      {
        node.on('input', function() {
          node.error(config.services + " not found");
        });
      }
  }
  RED.nodes.registerType("augmencia-get-projects",GetProjectsNode);
}