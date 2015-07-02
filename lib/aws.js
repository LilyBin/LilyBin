const AWS = require('aws-sdk');
AWS.config.credentials = new AWS.EC2MetadataCredentials();
AWS.config.region = 'us-west-2'; // See aws/aws-sdk-js#473

module.exports = AWS;
