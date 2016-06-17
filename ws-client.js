var WebSocket = require('ws')

var btoa = require('btoa');
var atob = require('atob');

var HID = require('node-hid');

var devices = HID.devices();

console.log("Connected usb devices:" +  JSON.stringify(devices));
var argv = require('optimist')
    .usage('Usage: node client.js -h [string] -t [string] -v [num] -p [num] \n')
    .demand('h')
    .alias('h','host')
    .describe('h', 'Websocket server host')
    .demand('t')
    .alias('t','port')
    .describe('t', 'Websocket server port')
    .demand('v')
    .alias('v','vid')
    .describe('v', 'Board vendor ID')
    .demand('p')
    .alias('p','pid')
    .describe('p', 'Board process ID')
    .argv;

var host = argv.h;
var port = argv.t;
var vid = argv.v;
var pid = argv.p;
var timeout = 1000;
var websocket = null;
var initialConnectionTimeout = 5000;
var device = new HID.HID(vid,pid);
if(device == undefined) {
    console.log("Board not found! Make sure that vendoir id and process id are correct");
    process.exit(1);
}
console.log('Connected to board')

//Data received from usb device
device.on("data", function(data) {
    var base64data = btoa(String.fromCharCode.apply(null, new Uint8Array(data)));
    console.log("sending: " + base64data)
    websocket.send(base64data);
});

//Err received from usb device
device.on("error", function(err) {
    console.log(err);
});

function setupWebSocket(){
    console.log("Connecting to Websocket Server");
    websocket = new WebSocket("ws://" + host + ":" + port);
    var reconnectInterval = setInterval(function() {
        console.log("websocket state: " + websocket.readyState);
        if(websocket.readyState == WebSocket.CONNECTING) {
            console.log("Closing!");
            websocket.terminate();
            clearInterval(reconnectInterval);
            setTimeout(setupWebSocket, timeout);
        }
        else {
            clearInterval(reconnectInterval);
        }
    },initialConnectionTimeout);

    //Message received from server
    websocket.onmessage = function (event) {
        console.log('received %s', event.data);
        data = [0];
        var buffer = new Buffer(event.data, 'base64')
        for(var i = 0; i< buffer.length;i++) {
            data.push(buffer[i]);
        }
        for(var i=0; i <64 - buffer.length;i++) {
            data.push(0);
        }
        device.write(data);
        console.log("after write");
    }

    websocket.on("ping", function() { // we received a ping from the server.
        console.log("ping received");
        websocket.pong();
    });

    websocket.onopen = function() {
        console.log("Successfully connected to Websocket Server");
    }

    websocket.onclose = function() {
        console.log('Connection terminated. Restarting websocket client');
        setTimeout(setupWebSocket, timeout);
    }
}

process.on('SIGINT', function () {
    device.close();
    process.exit(2);
});

setupWebSocket();