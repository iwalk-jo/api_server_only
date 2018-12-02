/*
* Create and export configuration variables
*
*/

// Container for all the environments
var environments = {};

// Staging (default) environment
environments.staging = {
    'httpPort' : 3000,
    'httpsPort': 3001,
    'envName' : 'staging',
    'hashingSecret' : 'thisIsASecret',
    'maxChecks' : 5,
    'mailgun' : {
        'sender': 'sms.iwalktech.com',
        'auth' : 'e325ec11d9cc6220bc54c611496d6f27-4836d8f5-3db71900',
        'pubKey' : 'aaa6b7759433327de5afd640cdb470d9'
    }
};




// Production environment
environments.production = {
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'envName' : 'production',
    'hashingSecret' : 'thisIsASecret',
    'maxChecks' : 5,
    'mailgun' : {
        'sender': 'sms.iwalktech.com',
        'auth' : 'e325ec11d9cc6220bc54c611496d6f27-4836d8f5-3db71900',
        'pubKey' : 'aaa6b7759433327de5afd640cdb470d9'
    }
};

// Determine which environment was passed as command-line argument
 var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

 // Check that the current environment is one of the environments above, if not, default to staging
 var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;


 // Export the module
 module.exports = environmentToExport;