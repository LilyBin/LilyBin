var Promise = require('bluebird');
var levelup = require('level');
var db = Promise.promisifyAll(levelup('./data'));

exports.scores = {
	get: function(id) {
		return db.getAsync(id)
			.then(JSON.parse)
	},
	save: function(id, code, version) {
		return Promise.resolve({code: code, version: version})
			.then(JSON.stringify)
			.then(db.putAsync.bind(db, id))
	}
};
