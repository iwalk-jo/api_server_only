/*
 * Server-related tasks
 *
 */

 // Dependencies
 var http = require('http');
 var https = require('https');
 var url = require('url');
 var StringDecoder = require('string_decoder').StringDecoder;
 var config = require('./config');
 var fs = require('fs');
 var handlers = require('./handlers');
 var helpers = require('./helpers');
 var path = require('path');
 var util = require('util');
 var debug = util.debuglog('server');




// Instantiate the server module object
var server = {};


 // Instanciate the HTTP server
 // The server should respond to all requests with a string
 server.httpServer = http.createServer(function(req,res){
     server.unifiedServer(req,res);
});



 // Define HTTPS server Options
 server.httpsServerOptions = {
     'key' : fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
     'cert' : fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
 };
 // Instanciate the HTTPS server
 server.httpsServer = https.createServer(server.httpsServerOptions,function(req,res){
    server.unifiedServer(req,res);
 });

 

// All the server logic for both the http and https server
server.unifiedServer = function(req,res){

     // Get the URL and parse it
 var parsedUrl = url.parse(req.url,true);

 // Get the path
 var path = parsedUrl.pathname;
 var trimmedPath= path.replace(/^\/+|\/+$/g, '');

 // Get the query string as an object
 var queryStringObject = parsedUrl.query;

 // Get the HTTP Method
 var method = req.method.toLowerCase();

 // Get the headers as an object
var headers = req.headers;

// Get the payload, if any
var decoder = new StringDecoder('utf-8');
var buffer = '';
req.on('data',function(data){
    buffer += decoder.write(data);
});
req.on('end',function(){
    buffer += decoder.end();


    // Looking for existing handler
    // Choose the handler this request should call. if one is not found, use the notFound handler
    var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    // Construct the data object to send to the handler
    var data = {
        'trimmedPath' : trimmedPath,
        'queryStringObject' : queryStringObject,
        'method' : method,
        'headers' : headers,
        'payload' : helpers.parseJsonToObject(buffer)
    };
    // console.log(data);

    // Route the request to the handler specified in the router
    chosenHandler(data,function(statusCode,payload){
        // Use the status code called back by the handler, or default to 200
        statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

        // Use the payload calledback by the handler, or default to an empty object
        payload = typeof(payload) == 'object' ? payload : {};

        // convert the payload to a string to return to user
        var payloadString = JSON.stringify(payload);

        // Return the response
        res.setHeader('Content-Type','application/json');
        res.writeHead(statusCode);
        res.end(payloadString);

        // If the response is 200, print green, otherwise print red
        if(statusCode == 200){
            debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
          } else {
            debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
          }

    });
 });
    
};



 // Define a request router
 server.router = {
     'ping': handlers.ping,
     'users' : handlers.users,
     'tokens' : handlers.tokens,
     'checks' : handlers.checks
 };

 // Init script
 server.init = function(){
    // Start the HTTP server
 server.httpServer.listen(config.httpPort,function(){
    console.log('\x1b[36m%s\x1b[0m','The HTTP server is running on port '+config.httpPort);
    
 }); 

 // Start the HTTPS server
 server.httpsServer.listen(config.httpsPort,function(){
    console.log('\x1b[35m%s\x1b[0m','The HTTPS server is running on port '+config.httpsPort);
 });

 };


 module.exports = server;