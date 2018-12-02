/*
* Helpers for various tasks
*/


// Dependencies
var config = require('./config');
var crypto = require('crypto');
var https = require('https');
var querystring = require('querystring');
var path = require('path');
var fs = require('fs');





// Container for all the helpers
var helpers = {};

 // Parse a JSON string to an object in all cases, without throwing
 helpers.parseJsonToObject = function(str){
    try{
        var obj = JSON.parse(str);
        return obj;
    } catch(e){
        return {};
    }
};

helpers.hash = function(str){
    if(typeof(str) == 'string' && str.length > 0){
      var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
      return hash;
    } else {
      return false;
    }
  };

 // Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = function(strLength){
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
  if(strLength){
    // Define all the possible characters that could go into a string
    var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    var str = '';
    for(i = 1; i <= strLength; i++) {
        // Get a random charactert from the possibleCharacters string
        var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
        // Append this character to the string
        str+=randomCharacter;
    }
    // Return the final string
    return str;
  } else {
    return false;
  }
};

// Send an Email message via mailgun
helpers.sendMailgunEmail = function (email, msg, callback) {
  // Validate parameters
  email = typeof (email) == 'string' && email.trim().length > 0 ? email.trim() : false;
  msg = typeof(msg) == 'string' && msg.trim().length > 0 ? msg.trim() : false;
	if (email && msg) {

// Configure the request payload
var payload = {
  'sender': config.mailgun.sender, 
  'to': email, 
  'text' : msg
};
var stringPayload = querystring.stringify(payload);

// Configure the request details
var requestDetails = {
  'protocol': 'https:',
  'hostname': 'api.mailgun.net',
  'method': 'POST',
  'path': '/v3/sms.iwalktech.com'+config.mailgun.auth+'/Messages.json',
  'auth':  config.mailgun.auth+':'+config.mailgun.pubKey,
			'headers': {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(stringPayload)
			}
};


// Instantiate the request object
var req = https.request(requestDetails, function (res) {
  // Grab the status of the sent request
  var status = res.statusCode;
		// Callback successfully if the request went through
    if (status == 200 || status == 201) {
      callback(false);
    } else {
      callback('Status code returned was' + status);
    }
  });

// Bind to the error event so it doesn't get thrown
req.on('error', function (e) { 
  callback(e);
});

// Add the payload
req.write(stringPayload);

// End the request
req.end();

} else {
      callback('Given parameters were missing or invalid');
}

};





// Export the module
module.exports = helpers;