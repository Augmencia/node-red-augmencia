module.exports = function(RED) {
  const grpc = require('@grpc/grpc-js');
  const protoLoader = require('@grpc/proto-loader');
  const Bottleneck = require('bottleneck');

  const PROTO_PATH = __dirname + '/../protos';
  const HEALTH_PROTO_PATH = PROTO_PATH + '/health';
  const API_PROTO_PATH = PROTO_PATH + '/api';

  const apiPackageDefinition = protoLoader.loadSync(
    API_PROTO_PATH + "/augmencia-api.proto",
    {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [API_PROTO_PATH]
    });
  const apiGrpcObject = grpc.loadPackageDefinition(apiPackageDefinition);

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

  function ApiNode(config) {
    RED.nodes.createNode(this,config);
    const node = this;
    
    const base64Payload = node.credentials.apiKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64Payload).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    node.apiKeyPayload = JSON.parse(jsonPayload);

    const [apiScheme, apiHostname] = config.serverUrl.split('://');
    const apiCredentials = apiScheme === 'https' ? grpc.ChannelCredentials.createSsl() : grpc.ChannelCredentials.createInsecure()
    node.api = new apiGrpcObject.Augmencia.Protos.AugmenciaApi(apiHostname, apiCredentials);
    node.health = new healthGrpcObject.grpc.health.v1.Health(apiHostname, apiCredentials);

    node.limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 50 + 1000 / config.maxRequestsPerSeconds
    })
    
    node.on('close', function(done) {
      node.api.close();
      node.health.close();
      done();
    });
  }
  
  RED.nodes.registerType("augmencia-api", ApiNode, {
    credentials: {
      apiKey: {type:"password", required:true},
    }
  });
}