//Use optimist to parse input arguments
var argv = require('optimist')
    .usage('Usage: ws-server -p [num] \n')
    .demand('p')
    .alias('p','port')
    .describe('p', 'port to open webserver on')
    .argv;

//Create web server and open it at specific port 
var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ port: argv.p });

var clients=[];
var maxClients=2;
var storedMessage = null;

wss.on('connection', function connection(client) {
  if(clients.length >= maxClients) {
    console.log("Cannot connect more clients");
    return;
  }
  clients.push(client);
  client.pingssent = 0;
  var interval = setInterval(function() {
      client.ping();
      client.pingssent++;
  }, 10*1000);// 10 seconds between pings

  client.on("pong", function() { // we received a pong from the client.
    client.pingssent = 0; // reset ping counter.
  });

  client.on('message', function incoming(message) {
    console.log("Client connected");
    if(clients.length ==1) {
      storedMessage = message;
      console.log("Waiting for second client to connect...");
      return;
    }
    for(var i=0;i<clients.length;i++) {
      if(clients[i] != client) {
        clients[i].send(message);
      }
    }
  });
  client.on('close', function closeSocket() {
    var index = clients.indexOf(client);
    clearInterval(interval);
    if (index > -1) {
      console.log("Client disconnected");
      clients.splice(index, 1);
    }
  });
  client.on('error', function socketError() {
    console.log("connection has error");
    client.close();
  });
  //message was sent before second client connected.
  if(clients.length == maxClients && storedMessage != null) {
    client.send(storedMessage);
    storedMessage = null;
  }
});
