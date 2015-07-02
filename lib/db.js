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
		version = version === 'unstable' ? version : 'stable';
		return this.revisions(id)
			.then(function (revs) {
				rev = ++revs;
				return Promise.all([
					db.putAsync(id + ':revisions', revs),
					db.putAsync(id + ':' + revs, {code, version})
				])
			}).then(function () {
				return {id: id, revision: rev};
			})
	}
};
