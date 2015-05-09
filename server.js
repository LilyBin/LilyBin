// Misc
var Promise = require('bluebird'),
	fs = Promise.promisifyAll(require('fs')),
	path = require('path'),
	exec = require('./lib/exec'),
	execSync = require('sync-exec'),
	_ = require('underscore');

// Express
var express = require('express'),
	app = express();

// Serve static files from ./htdocs
app.use(express.static(__dirname + '/htdocs'));
app.use('/js/', express.static(__dirname + '/node_modules/requirejs'));
app.use('/js/', express.static(__dirname + '/node_modules/underscore'));
app.use('/js/CodeMirror/', express.static(__dirname + '/node_modules/codemirror'));
// We don't need the extended features right now.
app.use(require('body-parser').urlencoded({extended: false}));

// Use underscore.js for templating.
var cache = {};
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

// Get config options
var config = require('./config.json'),
	versions = {};

// DB
var db = require('./lib/db');

app.post('/save', function(req, res) {
	var code = req.body.code,
		id = req.body.id || Math.random().toString(36).substring(2, 8),
		revision = req.body.revision || 1,
		version = req.body.version || 'stable',
		tempSrc = __dirname + '/src/' + id + '.ly';

	db.scores.save(id+':'+revision, code, version)
		.then(function () {
			res.send({id: id, revision: revision});
		}).catch(function (err) {
			return res.send(err, 500);
       	}).catch(console.error);
});

app.post('/prepare_preview', function(req, res) {
	var code = req.body.code,
		id = req.body.id || Math.random().toString(36).substring(2, 8),
		version = req.body.version || 'stable',
		tempSrc = __dirname + '/render/' + id + '.ly',
		results;

	fs.writeFileAsync(tempSrc, code).catch(function (err) {
		return Promise.reject({ text: 'Cannot write file', err: err});
	}).then(function() {
		return exec(
			config.bin[version] +
			' --formats=pdf,png' +
			' -o ' + __dirname + '/render/' + id +
			' ' + tempSrc
		).catch(function (err) {
			res.send({
				error: err.stderr,
				id: id,
				pages: 0
			});
			return Promise.reject('DONE');
		});
	}).then(function (ret) {
		results = ret;
		return fs.statAsync(
			__dirname + '/render/' + id + '.png'
		).catch(function () {
			return countPages(id, 1).then(function (pages) {
				res.send({
					output: results.stderr,
					id: id,
					pages: pages
				});
				return Promise.reject('DONE');
			});
		});
	}).then(function () {
		return fs.renameAsync(
			__dirname + '/render/' + id + '.png',
			__dirname + '/render/' + id + '-page1' + '.png'
		).catch(function (err) {
			return Promise.reject({ text: 'file rename failed', err: err });
		});
	}).then(function () {
		res.send({
			output: results.stderr,
			id: id,
			pages: 1
		});
	}).catch(function (err) {
		if (err === 'DONE') return;
		res.status(500).send('Internal server error: ' +
			(err.text || err.message || '')
		);
		console.error(err.err || err);
	}).catch(console.error);
});

app.get('/preview', function(req, res) {
	var id = req.query.id,
		page = req.query.page || 1;

	res.sendFile(__dirname + '/render/' + id + '-page' + page + '.png');
});


app.get('/downloadPDF', function(req, res) {
	var id = req.query.id;

	res.download(__dirname + '/render/' + id + '.pdf', 'score.pdf');
});

app.get('/downloadMidi', function(req, res) {
	var id = req.query.id;

	res.download(__dirname + '/render/' + id + '.midi', 'score.midi');
});

app.get('/:id?/:revision?', function(req, res, next) {
	var id = req.params.id,
		revision = req.params.revision || 1;

	if (!id) {
		return res.render('index.html', {
			score: JSON.stringify({
				id: '',
				revision: '0',
				code: '% LilyBin\n{\n  c\'\n}',
			}),
			versions: versions,
		});
	}

	db.scores.get(id+':'+revision)
		.then(function (score) {
			if (!score) throw new Error('no score');
			score.id = id;
			score.revision = revision;
			res.render('index.html', {
				score: JSON.stringify(score), versions: versions});
		}).catch(function(err) {
			next();
		})
});

var bins = Object.keys(config.bin)
for (var i = 0; i < bins.length; i++) {
	var out = execSync(config.bin[bins[i]] + ' -v');
	if (out.status !== 0) {
		console.error(config.bin[bins[i]] + ' -v:');
		console.error(out);
		throw new Error('LilyPond installation broken');
	}
	versions[bins[i]] = out.stdout.match(/^GNU LilyPond (.*)$/m)[1];
}

var port;
app.listen(port = process.env.LISTEN_PORT || 3001);
console.log('Listening on port ' + port + '.');

function countPages(id) {
	var re = new RegExp(id + '-page.*\.png');
	return fs.readdirAsync(__dirname + '/render').then(function (files) {
		return files.filter(function (f) {
			return re.test(f);
		}).length;
	});
}
