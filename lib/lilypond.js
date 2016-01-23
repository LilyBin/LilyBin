var Promise = require('bluebird');
const AWS = require('./aws');
const lambda = new AWS.Lambda({apiVersion: '2015-03-31'});

module.exports = function(id, code, version) {
	version = (version === 'unstable') ? 'unstable' : 'stable';

	return new Promise(function (fulfill, reject) {
		lambda.invoke({
			FunctionName: 'lilybin-' + version,
			Payload: JSON.stringify({
				code,
				id,
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
};
