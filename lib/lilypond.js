var Promise = require('bluebird');
var AWS = require('aws-sdk');
var credentials = new AWS.SharedIniFileCredentials({profile: 'lilybin'});
AWS.config.credentials = credentials;
AWS.config.region = 'us-west-2'; // See aws/aws-sdk-js#473
var lambda = new AWS.Lambda({apiVersion: '2015-03-31'});

module.exports = {
  compile: function(key, body, version) {
    version = (version === 'unstable') ? 'unstable' : 'stable';

    return new Promise(function (fulfill, reject) {
      lambda.invoke({
        FunctionName: 'lilybin-' + version,
        Payload: JSON.stringify({
          body   : body,
          key    : key
        })
      }, function (err, data) {
        if (err) return reject(err);
        var payload = JSON.parse(data.Payload);
        if (data.FunctionError) {
          return reject(new Error(payload.errorMessage));
        }
        fulfill(payload);
      });
    });
  },
};
