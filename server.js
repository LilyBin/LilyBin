// Promise might be already declared if Node.js/io.js is new enough. `const`
// theoretically wouldn't work in those cases.
var Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

// Express
const express = require('express'),
	favicon = require('serve-favicon'),
	app = express();

// Serve static files from ./htdocs
app.use(favicon(__dirname + '/htdocs/favicon.ico'));
app.use(express.static(__dirname + '/htdocs', {maxage: '1d'}));
// We don't need the extended features right now.
app.use(require('body-parser').urlencoded({extended: false}));

// Trust the proxy
if (process.env.LILYBIN_PROXY) {
	app.set('trust proxy', 'loopback');
}

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
	res.set('Cache-Control', 'no-cache');
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
		console.error(err.stack || err.message || err);
	}).catch(console.error);
});

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

app.get('/api/:id?/:revision?', function(req, res, next) {
	const id = req.params.id,
		revision = +req.params.revision || 1;

	if (!id) return res.json({code: defaultScore, version: 'stable'})
	scores.get(id, revision)
		.then(function (score) {
			res.json(score);
		}).catch(function(err) {
			if (err.notFound) {
				return res.status(404).json({err: 'Score not found'});
			}
			res.status(500).json({err: 'Internal server error'});
			console.error(err);
		}).catch(console.error);
});

app.get('/:id?/:revision?', function(req, res, next) {
	res.sendFile(__dirname + '/htdocs/index.html', {
		maxAge: '1d'
	});
});

const port = process.env.LISTEN_PORT || 3001;
app.listen(port);
console.log('Listening on port ' + port + '.');
