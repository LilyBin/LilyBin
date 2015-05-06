var levelup = require('level');
var db = levelup('./data');

exports.scores = {
	get: function(id, cb) {
		db.get(id, function(err, data) {
			if (err) {
				return cb(err);
			}

			try {
				var revision = JSON.parse(data);
			} catch (e) {
				return cb(e);
			}

			cb(null, revision);
		});
	},
	save: function(id, code, version, cb) {
		try {
			var data = JSON.stringify({code: code, version: version});
		} catch (e) {
			return cb(e);
		}

		db.put(id, data, cb);
	}
};
