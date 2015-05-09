// Promise might be already declared if Node.js/io.js is new enough. `const`
// theoretically wouldn't work in those cases.
var Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs')),
	path = require('path'),
	exec = require('./lib/exec'),
	execSync = require('sync-exec'),
	_ = require('underscore');

// Express
const express = require('express'),
	app = express();

// Serve static files from ./htdocs
app.use(express.static(__dirname + '/htdocs'));
app.use('/js/', express.static(__dirname + '/node_modules/requirejs'));
app.use('/js/', express.static(__dirname + '/node_modules/underscore'));
app.use('/js/CodeMirror/', express.static(__dirname + '/node_modules/codemirror'));
// We don't need the extended features right now.
app.use(require('body-parser').urlencoded({extended: false}));

// Use underscore.js for templating.
const cache = {};
app.engine('html', function (path, options, callback) {
	if (cache[path]) {
		return Promise.resolve(options)
			.then(cache[path])
			.nodeify(callback);
	}

	fs.readFileAsync(path, 'utf8')
		.then(function (str) {
			cache[path] = _.template(str);
			return cache[path](options);
		}).nodeify(callback);
});
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

// Default score
const defaultScore = fs.readFileSync(__dirname + '/default.ly', 'utf8');

// Get config options
const config = require('./config.json'),
	versions = {};

// DB
const db = require('./lib/db');

const MAX_ATTEMPTS = 5;
function getNewId(attempt) {
	attempt = attempt || 0;
	const id = Math.random().toString(36).substring(2, 8);

	return db.scores.get(id + ':1').then(function () {
		if (++attempt >= MAX_ATTEMPTS) {
			return Promise.reject(new Error('Too many attempts for new ID'));
		}
		return getNewId(attempt);
	}, function () {
		return id;
	})
}

app.post('/save', function(req, res) {
	const code = req.body.code,
		revision = req.body.revision || 1,
		version = req.body.version || 'stable';
	var id;

	new Promise(function(fulfill, reject) {
		if (req.body.id) return fulfill(req.body.id);
		getNewId().then(fulfill, reject);
	}).then(function(_id) {
		id = _id;
	}).then(function() {
		return db.scores.save(id+':'+revision, code, version)
	}).then(function () {
		res.send({id: id, revision: revision});
	}).catch(function (err) {
		res.status(500).send('Internal server error: ' +
			(err.text || err.message || '')
		);
		console.error(err.err || err);
	}).catch(console.error);
});

app.post('/prepare_preview', function(req, res) {
	const code = req.body.code,
		version = req.body.version || 'stable';
	var id,
		tempSrc,
		response = {};

	new Promise(function(fulfill, reject) {
		if (req.body.id) return fulfill(req.body.id);
		getNewId().then(fulfill, reject);
	}).then(function(_id) {
		id = _id;
		tempSrc = __dirname + '/render/' + _id + '.ly';
		response.id = _id;
	}).then(function() {
		return fs.writeFileAsync(tempSrc, code).catch(function (err) {
			return Promise.reject({ text: 'Cannot write file', err: err});
		});
	}).then(function() {
		return exec(
			config.bin[version] +
			' --formats=pdf,png' +
			' -o ' + __dirname + '/render/' + id +
			' ' + tempSrc
		).then(function (ret) {
			response.output = ret.stderr;
			return fs.statAsync(
				__dirname + '/render/' + id + '.png'
			).then(function () {
				response.pages = 1;
				return fs.renameAsync(
					__dirname + '/render/' + id + '.png',
					__dirname + '/render/' + id + '-page1' + '.png'
				).catch(function (err) {
					return Promise.reject({ text: 'file rename failed', err: err });
				});
			}, function () {
				return countPages(id, 1).then(function (pages) {
					response.pages = pages;
				});
			})
		}, function (err) {
			response.error = err.stderr;
			response.pages = 0;
		});
	}).then(function () {
		// res.send.bind(res, response) doesn't work because Express.js supports
		// a two-argument form of res.send.
		res.send(response);
	}).catch(function (err) {
		res.status(500).send('Internal server error: ' +
			(err.text || err.message || '')
		);
		console.error(err.err || err);
	}).catch(console.error);
});

app.get('/preview', function(req, res) {
	const id = req.query.id,
		page = req.query.page || 1;

	res.sendFile(__dirname + '/render/' + id + '-page' + page + '.png');
});


app.get('/downloadPDF', function(req, res) {
	const id = req.query.id;

	res.download(__dirname + '/render/' + id + '.pdf', 'score.pdf');
});

app.get('/downloadMidi', function(req, res) {
	const id = req.query.id;

	res.download(__dirname + '/render/' + id + '.midi', 'score.midi');
});

app.get('/:id?/:revision?', function(req, res, next) {
	const id = req.params.id,
		revision = req.params.revision || 1;

	if (!id) {
		return res.render('index.html', {
			score: JSON.stringify({
				id: '',
				revision: '0',
				code: defaultScore,
			}),
			versions: versions,
		});
	}

	db.scores.get(id+':'+revision)
		.then(function (score) {
			score.id = id;
			score.revision = revision;
			res.render('index.html', {
				score: JSON.stringify(score), versions: versions});
		}).catch(function(err) {
			if (err.notFound) {
				return res.status(404).send('Score not found');
			}
			res.status(500).send('Internal server error');
			console.error(err);
		}).catch(console.error);
});

const bins = Object.keys(config.bin)
for (var i = 0; i < bins.length; i++) {
	var out = execSync(config.bin[bins[i]] + ' -v');
	if (out.status !== 0) {
		console.error(config.bin[bins[i]] + ' -v:');
		console.error(out);
		throw new Error('LilyPond installation broken');
	}
	versions[bins[i]] = out.stdout.match(/^GNU LilyPond (.*)$/m)[1];
}

const port = process.env.LISTEN_PORT || 3001;
app.listen(port);
console.log('Listening on port ' + port + '.');

function countPages(id) {
	const re = new RegExp(id + '-page.*\.png');
	return fs.readdirAsync(__dirname + '/render').then(function (files) {
		return files.filter(function (f) {
			return re.test(f);
		}).length;
	});
}
