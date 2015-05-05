var collections = {
		scores: null,
		log: null
	},
	_exports = {};

_exports.scores = {
	get: function(o, cb) {
		var id = o.id, revision = o.revision || 1;
		collections.scores.findOne({_id: id}, {revisions: {$slice: [revision - 1, 1]}}, function(err, score) {
			if (err) return cb(err);
			cb(null, (score || {revisions: [null]}).revisions[0]);
		});
	},
	save: function(score, cb) {
		var id = score.id,
			revision = {code: score.code, version: score.version};
			
		collections.scores.update({_id: id}, {$push: {revisions: revision}}, {upsert: true}, function(err) {
			if (err) {
				console.log(err);
				return cb(err);
			}
			collections.scores.findOne({_id: id}, function(_err, score) {
				if (_err) return cb(_err);
				cb(null, score.revisions.length);
			});
		});
	}
};

_exports.log = function(o) {
	o.time = new Date();
	collections.log.insert(o);
};

module.exports = function(db) {
	var cols = Object.keys(collections);
	for (var i = 0; i < cols.length; i++) {
		db.collection(cols[i], function(err, collection) {
			// Fatal error; exit as early as possible.
			if (err) throw err;
			collections[cols[i]] = collection;
		});
	}
	return _exports;
};
