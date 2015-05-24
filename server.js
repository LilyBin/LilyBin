// Promise might be already declared if Node.js/io.js is new enough. `const`
// theoretically wouldn't work in those cases.
var Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs')),
	path = require('path'),
	_ = require('underscore');

// Express
const express = require('express'),
	favicon = require('serve-favicon'),
	app = express();

const renderDir = __dirname + '/render/';

var lilypond = require('./lib/lilypond');

// Serve static files from ./htdocs
app.use(favicon(__dirname + '/htdocs/favicon.ico'));
app.use(express.static(__dirname + '/htdocs'));
app.use('/css/', express.static(__dirname + '/node_modules/normalize.css'));
app.use('/js/', express.static(__dirname + '/node_modules/requirejs'));
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

// DB
const scores = require('./lib/db');

const MAX_ATTEMPTS = 5;
function getNewId(attempt) {
	attempt = attempt || 0;
	const id = Math.random().toString(36).substring(2, 8);

	return scores.get(id, 1).then(function () {
		if (++attempt >= MAX_ATTEMPTS) {
			return Promise.reject(new Error('Too many attempts for new ID'));
		}
		return getNewId(attempt);
	}, function () {
		return id;
	})
}

app.post('/save', function(req, res) {
	Promise.resolve(null).bind({id: req.body.id}).then(function() {
		if (this.id) return;

		return getNewId().bind(this).then(function(id) {
			this.id = id;
		});
	}).then(function() {
		return scores.save(this.id, req.body.code, req.body.version);
	}).then(function (info) {
		res.send(info);
	}).catch(function (err) {
		res.status(500).send('Internal server error: ' +
			(err.text || err.message || '')
		);
		console.error(err.err || err);
	}).catch(console.error);
});

var mkdirp = Promise.promisify(require('mkdirp'));
app.post('/prepare_preview', function(req, res) {
	const code = req.body.code;
	var id,
		tempDir,
		tempSrc,
		response = {};

	new Promise(function(fulfill, reject) {
		if (req.body.id) return fulfill(req.body.id);
		getNewId().then(fulfill, reject);
	}).then(function(_id) {
		id = _id;
		tempDir = renderDir + _id;
		tempSrc = tempDir + '/score.ly';
		response.id = _id;
	}).then(function() {
		return mkdirp(tempDir)
		.then(function() {
			return fs.writeFileAsync(tempSrc, code);
		}).catch(function (err) {
			return Promise.reject({ text: 'Cannot write file', err: err});
		});
	}).then(function() {
		return lilypond.compile(tempDir, 'score.ly', req.body.version)
		.then(function (ret) {
			response.output = ret;
			return (fs.accessAsync || fs.statAsync)(
				renderDir + id + '/rendered.png'
			).then(function () {
				response.pages = 1;
				return fs.renameAsync(
					renderDir + id + '/rendered.png',
					renderDir + id + '/rendered-page1' + '.png'
				).catch(function (err) {
					return Promise.reject({ text: 'file rename failed', err: err });
				});
			}, function () {
				return countPages(id, 1).then(function (pages) {
					response.pages = pages;
				});
			})
		}, function (err) {
			response.error = err;
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

	res.sendFile(renderDir + id + '/rendered-page' + page + '.png');
});


app.get('/downloadPDF', function(req, res) {
	const id = req.query.id;

	res.download(renderDir + id + '/rendered.pdf', 'score.pdf');
});

app.get('/downloadMidi', function(req, res) {
	const id = req.query.id;

	res.download(renderDir + id + '/rendered.midi', 'score.midi');
});

var versions;
function handleMain(req, res, next) {
	const id = req.params.id,
		revision = +req.params.revision || 1;

	if (!id) {
		return res.render('index.html', {
			score: {
				id: '',
				code: defaultScore,
			},
			versions: versions,
		});
	}

	scores.get(id, revision)
		.then(function (score) {
			score.id = id;
			res.render('index.html', {
				score: score, versions: versions});
		}).catch(function(err) {
			if (err.notFound) {
				return res.status(404).send('Score not found');
			}
			res.status(500).send('Internal server error');
			console.error(err);
		}).catch(console.error);
}

app.get('/raw/:id/:revision?', function(req, res, next) {
	const id = req.params.id,
		revision = +req.params.revision || 1;

	res.set('Content-Type', 'text/plain');
	scores.get(id, revision)
		.then(function (score) {
			res.send(score.code);
		}).catch(function(err) {
			if (err.notFound) {
				return res.status(404).send('Score not found');
			}
			res.status(500).send('Internal server error');
			console.error(err);
		}).catch(console.error);
});

lilypond.versions().then(function(_versions) {
	versions = _versions;
	app.get('/:id?/:revision?', handleMain);

	const port = process.env.LISTEN_PORT || 3001;
	app.listen(port);
	console.log('Listening on port ' + port + '.');
});

function countPages(id) {
	const re = new RegExp('rendered-page.*\.png');
	return fs.readdirAsync(renderDir + id).then(function (files) {
		return files.filter(re.test.bind(re)).length;
	});
}
