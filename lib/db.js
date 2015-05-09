var Promise = require('bluebird');
const levelup = require('level');
const db = Promise.promisifyAll(levelup('./data', {
	valueEncoding: 'json'
}));

module.exports = {
	get: function(id, rev) {
		return db.getAsync(id + ':' + rev)
	},
	revisions: function(id) {
		return db.getAsync(id + ':revisions')
			.then(null, function (err) {
				if (err.notFound) return 0;
				return Promise.reject(err);
			})
	},
	save: function(id, code, version) {
		var rev;
		return this.revisions(id)
			.then(function (revs) {
				rev = ++revs;
				return Promise.join(
					db.putAsync(id + ':revisions', revs),
					Promise.resolve({code: code, version: version})
						.then(db.putAsync.bind(db, id + ':' + revs))
				)
			}).then(function () {
				return {id: id, revision: rev};
			})
	}
};
