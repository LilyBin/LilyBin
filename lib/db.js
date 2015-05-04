var Db = require('mongodb').Db,
	ObjectID = require('mongodb').ObjectID/*,
	BSON = require('mongodb').BSONNative*/;

var nativeParser = false;

var collections = {
		scores: null,
		log: null
	},
	_exports = {};

_exports.scores = {
	get: function(o, cb) {
		var id = o.id, revision = o.revision || 1;
		collections.scores.findOne({_id: id}, {revisions: {$slice: [revision - 1, 1]}}, function(err, score) {
			if (cb) cb(err, (score || {revisions: [null]}).revisions[0]);
		});
	},
	save: function(score, cb) {
		var id = score.id,
			revision = {code: score.code, version: score.version};
			
		collections.scores.update({_id: id}, {$push: {revisions: revision}}, {upsert: true}, function(err) {
			if (err) console.log(err);
			if (cb) {
				collections.scores.findOne({_id: id}, function(_err, score) {
					cb(err, score.revisions.length);
				});
			}
		});
	}
};

_exports.log = function(o) {
	o.time = new Date();
	collections.log.insert(o);
};

exports.connect = function(db, cb) {
	db.open(function(err, db) {
		for (var c in collections) {
			db.collection(c, function(err, collection) {
				collections[c] = collection;
			});
		}
		
		if (cb) cb(_exports);
	});
};
