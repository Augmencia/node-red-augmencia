const grpc = require('@grpc/grpc-js');

module.exports = function(RED) {
  function ProjectsEventsListenerNode(config) {
    RED.nodes.createNode(this,config);
    const node = this;
    const augmenciaServices = RED.nodes.getNode(config.services);
    if (augmenciaServices)
    {
      let stream;
      let timeout;
      let isClosed = false;
      const metadata = new grpc.Metadata();
      metadata.set('Authorization', `Bearer ${augmenciaServices.credentials.apiKey}`);
      (async function subscribeToProjectsEvents() {
        stream = undefined;
        await augmenciaServices.limiter.schedule(() => new Promise((resolve, reject) => {
          if (isClosed) {
            resolve();
            return;
          }
          node.status({fill:'green',shape:'dot',text:'node-red:common.status.connected'})
          stream = augmenciaServices.projectsService.RegisterToProjectsModifications({}, metadata)
            .on('data', function(project) {
              if (!isClosed) {
                node.send({
                  payload: project
                });
              }
              resolve();
            })
            .on('end', function() {
              if (!isClosed) {
                node.status({fill:'red',shape:'ring',text:'node-red:common.status.disconnected'});
                timeout = setTimeout(subscribeToProjectsEvents, 5000);
              }
              resolve()
            })
            .on('error', function(e) {
              if (!isClosed) {
                node.error(e, msg);
              }
            });
            setTimeout(resolve, 1000);
        }))
      })();
      node.on('close', function() {
        isClosed = true;
        node.status({});
        stream?.cancel();
        if (timeout) {
          clearTimeout(timeout);
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
  
  RED.nodes.registerType("augmencia-projects-events-listener", ProjectsEventsListenerNode);
}