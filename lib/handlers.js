/*
* Create and export handlers variables
*
*/


// Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');
var util = require('util');
var debug = util.debuglog('handlers');

// Define the handlers
var handlers = {};


// Not-Found
handlers.notFound = function(data,callback){
    callback(404);
  };

// Users
handlers.users = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method] (data,callback);
    } else {
        callback(405);
    }
};

// Container for the users submethods
handlers._users = {};

// Create a users method post
// Required data: email, userName, password, tosAgreement
// Optional data none
handlers._users.post = function(data,callback){
    // Check that all required field are filled out
    // Validate data
    var regEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 0 && regEmail.test(data.payload.email.toLowerCase()) ? data.payload.email : false;
    var userName = typeof(data.payload.userName) == 'string' && data.payload.userName.trim().length > 0 ? data.payload.userName.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement === true ? true : false;

    if(userName && email && password && tosAgreement){
        // Make sure that the user dosent already exist
        _data.read('users',email,function(err,data){
            if(err){
                // Hash the password
                var hashedPassword = helpers.hash(password);

                // Create the user object
                if(hashedPassword){
                    var userObject = {
                        'userName' : userName,
                        'email' : email, 
                        'hashedPassword' : hashedPassword,
                        'tosAgreement' : true
                     };
     
                     // Store the user
                     _data.create('users',email,userObject,function(err){
                         if(!err){
                             callback(200);
                         } else {
                             debug(err);
                             callback(500,{'Error' : 'Could not create the new user'});
                         }
                     });
                } else {
                   callback(500,{'Error' : 'Could not hash the user\'s password'}); 
                }
               
            } else {
                // User already exists
                callback(400,{'Error' : 'User already exists'});
            }
        });

    } else {
        callback(400,{'Error' : 'Missing required fields'});
    }
};

// Create a users method get
// Required data: email
// Optional data: none
handlers._users.get = function(data,callback){
    // Check that user email is valid
    var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? data.queryStringObject.email.trim() : false;
    if(email){

        // Get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the email
        handlers._tokens.verifyToken(token,email,function(tokenIsValid){
            if(tokenIsValid){
                // Lookup the user
          _data.read('users',email,function(err,data){
            if(!err && data){
             // Remove the hashed password from the user user object before returning it to the requester
             delete data.hashedPassword;
            callback(200,data);
        } else {
          callback(404);
        }
      });      
            } else {
                callback(403,{'Error' : 'Missing required token in header or token is invalid'});
            }
        });
    } else {
      callback(400,{'Error' : 'Missing required field'});
    }
  };
  
  // Create a user method put
  // Required data: email
// Optional data: userName, password (at least one must be specified)
handlers._users.put = function(data,callback){
    // Check for required field
    var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;
  
    // Check for optional fields
    var userName = typeof(data.payload.userName) == 'string' && data.payload.userName.trim().length > 0 ? data.payload.userName.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  
    // Error if email is invalid
    if(email){
      // Error if nothing is sent to update
      if(userName || password){
         // Get the token from the headers
         var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
             // Verify that the given token is valid for the email
        handlers._tokens.verifyToken(token,email,function(tokenIsValid){
            if(tokenIsValid){
                        // Lookup the user
        _data.read('users',email,function(err,userData){
            if(!err && userData){
              // Update the fields if necessary
              if(userName){
                userData.userName = userName;
              }
              if(password){
                userData.hashedPassword = helpers.hash(password);
              }
              // Store the new updates
              _data.update('users',email,userData,function(err){
                if(!err){
                  callback(200);
                } else {
                  debug(err);
                  callback(500,{'Error' : 'Could not update the user.'});
                }
              });
            } else {
              callback(400,{'Error' : 'Specified user does not exist.'});
            }
          });
            } else {
                callback(403,{'Error' : 'Missing required token in header, or token is invalid'});
            }
        });
      } else {
        callback(400,{'Error' : 'Missing fields to update.'});
      }
    } else {
      callback(400,{'Error' : 'Missing required field.'});
    }
  };

 // Create a user method delete
  // Required data: email
// @TODO Cleanup (delete) any other data files associated with the user
handlers._users.delete = function(data,callback){
    // Check that user email is valid
    var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? data.queryStringObject.email.trim() : false;
    if(email){
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the email
   handlers._tokens.verifyToken(token,email,function(tokenIsValid){
       if(tokenIsValid){
          // Lookup the user
      _data.read('users',email,function(err,userData){
        if(!err && userData){
          _data.delete('users',email,function(err){
            if(!err){
              // Delete each of the checks associated with the user
              var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
              var checksToDelete = userChecks.length;
              if(checksToDelete > 0){
                var checksDeleted = 0;
                var deletionErrors = false;
                // Loop through the checks
                userChecks.forEach(function(checkId){
                  // Delete the checks
                  _data.delete('checks',checkId,function(err){
                    if(err){
                      deletionErrors = true;
                    }
                    checksDeleted++;
                    if(checksDeleted == checksToDelete){
                      if(!deletionErrors){
                        callback(200);
                      } else {
                        callback(500,{'Error' : 'Errors encountered while attempting to delete all of the user\'s checks. All checks may not have been deleted from the system successfully'});
                      }
                    }
                  });
                });
              } else {
                callback(200);
              }

            } else {
              callback(400,{'Error' : 'Could not delete the specified user'});
            }
          });
        } else {
          callback(400,{'Error' : 'Could not find the specified user.'});
        }
      });
       } else {
        callback(403,{'Error' : 'Missing required token in header, or token is invalid'});
       }
    });
    } else {
      callback(400,{'Error' : 'Missing required field'});
    }
  };




// Tokens
handlers.tokens = function(data, callback){
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
    handlers._tokens[data.method](data,callback);
    } else {
      callback(405);
    }
  };
  

  // Container for all the tokens method
  handlers._tokens = {};

  // Tokens -post
  // Required data: email, password
    // Optional data: none
  handlers._tokens.post = function(data,callback){ 
        // Check that all required field are filled out
        // Validate data
        var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;
        var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
        if(email && password){
            // Lookup the user with matching email
            _data.read('users',email,function(err,userData){
                if(!err && userData){
                    // Hash the sent password, and compare it to the password stored in the user object
                    var hashedPassword = helpers.hash(password);
                    if(hashedPassword == userData.hashedPassword){
                        // If valid, create a new token with a random name. Set expiration date 1 hour in the future
                        var tokenId = helpers.createRandomString(20);
                        var expires = Date.now() + 1000 * 60 * 60;
                        var tokenObject = {
                            'email' : email,
                            'id' : tokenId,
                            'expires' : expires
                        };

                        // Store the token
                        _data.create('tokens',tokenId,tokenObject,function(err){
                            if(!err){
                                callback(200,tokenObject);
                            } else {
                                callback(500,{'Error' : 'Could not create the new token'});
                            }
                        });
                    } else {
                       callback(400,{'Error' : 'Password did not match the specified user\'s stored password'}); 
                    }
                } else {
                    callback(400,{'Error' : 'Could not find the specified user'});
                }
            });
        } else {
            callback(400,{'Error' : 'Missing required field(s)'});
        }
  };

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function(data,callback){
    // Check that id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
      // Lookup the token
      _data.read('tokens',id,function(err,tokenData){
        if(!err && tokenData){
          callback(200,tokenData);
        } else {
          callback(404);
        }
      });
    } else {
      callback(400,{'Error' : 'Missing required field, or field invalid'});
    }
  };

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function(data,callback){
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if(id && extend){
      // Lookup the existing token
      _data.read('tokens',id,function(err,tokenData){
        if(!err && tokenData){
          // Check to make sure the token isn't already expired
          if(tokenData.expires > Date.now()){
            // Set the expiration an hour from now
            tokenData.expires = Date.now() + 1000 * 60 * 60;
            // Store the new updates
            _data.update('tokens',id,tokenData,function(err){
              if(!err){
                callback(200);
              } else {
                callback(500,{'Error' : 'Could not update the token\'s expiration.'});
              }
            });
          } else {
            callback(400,{"Error" : "The token has already expired, and cannot be extended."});
          }
        } else {
          callback(400,{'Error' : 'Specified user does not exist.'});
        }
      });
    } else {
      callback(400,{'Error': 'Missing required field(s) or field(s) are invalid.'});
    }
  };
  
// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function(data,callback){
    // Check that id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
      // Lookup the token
      _data.read('tokens',id,function(err,tokenData){
        if(!err && tokenData){
          // Delete the token
          _data.delete('tokens',id,function(err){
            if(!err){
              callback(200);
            } else {
              callback(500,{'Error' : 'Could not delete the specified token'});
            }
          });
        } else {
          callback(400,{'Error' : 'Could not find the specified token.'});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing required field'});
    }
  };
  
// Verify if a given id is currently valid for a given user
handlers._tokens.verifyToken = function(id,email,callback){
    // Lookup the token
    _data.read('tokens',id,function(err,tokenData){
      if(!err && tokenData){
        // Check that the token is for the given user and has not expired
        if(tokenData.email == email && tokenData.expires > Date.now()){
          callback(true);
        } else {
          callback(false);
        }
      } else {
        callback(false);
      }
    });
  };
  
  // Checks
  handlers.checks = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
      handlers._checks[data.method](data,callback);
    } else {
      callback(405);
    }
  };
  

  // Container for all the checks methods
  handlers._checks  = {};

  // Checks - post
  // Required data: protocol, url, method, successCode, timeoutSeconds
  // Optional data: none
  handlers._checks.post = function(data,callback){
    // Validate inputs
    var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
    if(protocol && url && method && successCodes && timeoutSeconds){
  
      // Get token from headers
      var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
  
      // Lookup the user email by reading the token
      _data.read('tokens',token,function(err,tokenData){
        if(!err && tokenData){
          var userEmail = tokenData.email;
  
          // Lookup the user data
          _data.read('users',userEmail,function(err,userData){
            if(!err && userData){
              var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
              // Verify that user has less than the number of max-checks per user
              if(userChecks.length < config.maxChecks){
                // Create random id for check
                var checkId = helpers.createRandomString(20);
  
                // Create the check object, and including the user's Email
                var checkObject = {
                  'id' : checkId,
                  'userEmail' : userEmail,
                  'protocol' : protocol,
                  'url' : url,
                  'method' : method,
                  'successCodes' : successCodes,
                  'timeoutSeconds' : timeoutSeconds
                };

                // Save the object
                _data.create('checks',checkId,checkObject,function(err){
                  if(!err){
                    // Add check id to the user's object
                    userData.checks = userChecks;
                    userData.checks.push(checkId);
                      // Save the new user data
                    _data.update('users',userEmail,userData,function(err){
                      if(!err){
                        // Return the data about the new check
                        callback(200,checkObject);
                      } else {
                        callback(500,{'Error' : 'Could not update the user with the new check.'});
                      }
                    });
                  } else {
                    callback(500,{'Error' : 'Could not create the new check'});
                  }
                });

              } else {
                callback(400,{'Error' : 'The user already has the maximum number of checks ('+config.maxChecks+')'});
              }
  
            } else {
              callback(403);
            }
          });
  
        } else {
          callback(403);
        }
      });
    } else {
      callback(400,{'Error' : 'Missing required inputs, or inputs are invalid'});
    }
  };
  
// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = function(data,callback){
  // Check that id is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    // Lookup the check
    _data.read('checks',id,function(err,checkData){
      if(!err && checkData){
        // Get the token that sent the request
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token,checkData.userEmail,function(tokenIsValid){
          if(tokenIsValid){
            // Return check data
            callback(200,checkData);
          } else {
            callback(403);
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field, or field invalid'});
  }
};

// Checks - put
// Required data: id
// Optional data: protocol,url,method,successCodes,timeoutSeconds (one must be sent)
handlers._checks.put = function(data,callback){
  // Check for required field
  var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

  // Check for optional fields
  var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  // Error if id is invalid
  if(id){
    // Error if nothing is sent to update
    if(protocol || url || method || successCodes || timeoutSeconds){
      // Lookup the check
      _data.read('checks',id,function(err,checkData){
        if(!err && checkData){
          // Get the token that sent the request
          var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
          // Verify that the given token is valid and belongs to the user who created the check
          handlers._tokens.verifyToken(token,checkData.userEmail,function(tokenIsValid){
            if(tokenIsValid){
              // Update check data where necessary
              if(protocol){
                checkData.protocol = protocol;
              }
              if(url){
                checkData.url = url;
              }
              if(method){
                checkData.method = method;
              }
              if(successCodes){
                checkData.successCodes = successCodes;
              }
              if(timeoutSeconds){
                checkData.timeoutSeconds = timeoutSeconds;
              }

              // Store the new updates
              _data.update('checks',id,checkData,function(err){
                if(!err){
                  callback(200);
                } else {
                  callback(500,{'Error' : 'Could not update the check.'});
                }
              });
            } else {
              callback(403);
            }
          });
        } else {
          callback(400,{'Error' : 'Check ID did not exist.'});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing fields to update.'});
    }
  } else {
    callback(400,{'Error' : 'Missing required field.'});
  }
};


// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = function(data,callback){
  // Check that id is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    // Lookup the check
    _data.read('checks',id,function(err,checkData){
      if(!err && checkData){
        // Get the token that sent the request
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token,checkData.userEmail,function(tokenIsValid){
          if(tokenIsValid){

            // Delete the check data
            _data.delete('checks',id,function(err){
              if(!err){
                // Lookup the user's object to get all their checks
                _data.read('users',checkData.userEmail,function(err,userData){
                  if(!err){
                    var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                    // Remove the deleted check from their list of checks
                    var checkPosition = userChecks.indexOf(id);
                    if(checkPosition > -1){
                      userChecks.splice(checkPosition,1);
                      // Re-save the user's data
                      userData.checks = userChecks;
                      _data.update('users',checkData.userEmail,userData,function(err){
                        if(!err){
                          callback(200);
                        } else {
                          callback(500,{'Error' : 'Could not update the user.'});
                        }
                      });
                    } else {
                      callback(500,{"Error" : "Could not find the check on the user's object, so could not remove it."});
                    }
                  } else {
                    callback(500,{"Error" : "Could not find the user who created the check, so could not remove the check from the list of checks on their user object."});
                  }
                });
              } else {
                callback(500,{"Error" : "Could not delete the check data."});
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400,{"Error" : "The check ID specified could not be found"});
      }
    });
  } else {
    callback(400,{"Error" : "Missing valid id"});
  }
};



// Ping handler
handlers.ping = function(data,callback){
    callback(200);
};




// Export the module
module.exports = handlers;