var cp = require('child_process'),
	Promise = require('bluebird');

module.exports = function () {
	var args = [].slice.apply(arguments);
	return new Promise(function (fulfill, reject) {
		args.push(function (err, stdout, stderr) {
			if (err) {
				err.stderr = stderr;
				return reject(err);
			}
			fulfill({
				stdout: stdout,
				stderr: stderr
			});
		});
		cp.exec.apply(cp, args);
	});
};
