const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function GetProjectsNode(config) {
      RED.nodes.createNode(this,config);
      const node = this;
      const augmenciaApi = RED.nodes.getNode(config.api);
      if (augmenciaApi)
      {
        node.on('input', async function(msg) {
          try
          {
            await augmenciaApi.limiter.schedule(() => new Promise((resolve, reject) => {
              const projects = [];
              let error = undefined;
              const metadata = new grpc.Metadata();
              metadata.set('Authorization', `Bearer ${augmenciaApi.credentials.apiKey}`);
              augmenciaApi.api.GetProjects({}, metadata)
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
  RED.nodes.registerType("augmencia-get-projects",GetProjectsNode);
}