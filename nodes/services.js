module.exports = function(RED) {
  const grpc = require('@grpc/grpc-js');
  const protoLoader = require('@grpc/proto-loader');
  const Bottleneck = require('bottleneck');

  const PROTO_PATH = __dirname + '/../protos';
  const HEALTH_PROTO_PATH = PROTO_PATH + '/health';
  const PROJECTS_PROTO_PATH = PROTO_PATH + '/projects';

  const projectsPackageDefinition = protoLoader.loadSync(
    PROJECTS_PROTO_PATH + "/projects-service.proto",
    {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [PROJECTS_PROTO_PATH]
    });
  const projectsGrpcObject = grpc.loadPackageDefinition(projectsPackageDefinition);

  const healthPackageDefinition = protoLoader.loadSync(
    HEALTH_PROTO_PATH + "/health.proto",
    {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
  const healthGrpcObject = grpc.loadPackageDefinition(healthPackageDefinition);

  const projectsServiceHostname = 'projects.augmencia.com'
  const projectsServiceCredentials = grpc.ChannelCredentials.createSsl()

  function ServicesNode(config) {
    RED.nodes.createNode(this,config);
    const node = this;
    
    const base64Payload = node.credentials.apiKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64Payload).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    node.apiKeyPayload = JSON.parse(jsonPayload);

    node.projectsService = new projectsGrpcObject.Augmencia.Protos.ProjectsService.ProjectsService(projectsServiceHostname, projectsServiceCredentials);
    node.health = {
      projectsService: new healthGrpcObject.grpc.health.v1.Health(projectsServiceHostname, projectsServiceCredentials)
    }

    node.limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 50 + 1000 / config.maxRequestsPerSeconds
    })
    
    node.on('close', function(done) {
      node.projectsService.close();
      node.health.projectsService.close();
      done();
    });
  }
  
  RED.nodes.registerType("augmencia-services", ServicesNode, {
    credentials: {
      apiKey: {type:"password", required:true},
    }
  });
}