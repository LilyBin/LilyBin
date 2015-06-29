var Promise = require('bluebird');
const levelup = require('level');
const ttl = require('level-ttl');
const db = Promise.promisifyAll(ttl(levelup('./data', {
	valueEncoding: 'json'
}), {
	checkFrequency: 1 * 60 * 60 * 1000 // an hour
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
	save: function(id, code, version, ttlMinutes) {
		var rev;
		version = version === 'unstable' ? version : 'stable';
		return this.revisions(id)
		.then(function(revs) {
			rev = ++revs;
			const options = ttlMinutes ? { ttl: ttlMinutes * 60 * 1000 }
			                           : {};
			const revPromise = db.putAsync(
				id + ':revisions',
				revs,
				// If this is a new key, expire this key if a ttl is
				// specified.
				revs === 1 ? options : {}
			);
			const putPromise = db.putAsync(
				id + ':' + revs,
				{ code, version },
				options
			);
			return Promise.join(revPromise, putPromise);
		}).then(function () {
			return {id: id, revision: rev};
		})
	}
};
