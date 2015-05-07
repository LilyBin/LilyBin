// Misc
var fs = require('fs'),
	path = require('path'),
	exec = require('child_process').exec,
	execSync = require('sync-exec'),
	_ = require('underscore');

// Express
var express = require('express'),
	app = express();

// Serve static files from ./htdocs
app.use(express.static(__dirname + '/htdocs'));
app.use('/js/', express.static(__dirname + '/node_modules/requirejs'));
app.use('/js/CodeMirror/', express.static(__dirname + '/node_modules/codemirror'));
// We don't need the extended features right now.
app.use(require('body-parser').urlencoded({extended: false}));
app.use(require('cookie-parser')());
app.use(require('cookie-session')({
	secret: process.env.SESSION_SECRET || 'secret',
	maxAge: 2592000000,
	path: '/'
}));

// Use underscore.js for templating.
var cache = {};
app.engine('html', function (path, options, callback) {
	var str;

	if (cache[path]) {
		try {
			str = cache[path](options);
		} catch (e) {
			return callback(e);
		}
		return callback(null, str);
	}

	fs.readFile(path, function (e, content) {
		if (e) return callback(e);
		str = content.toString();
		try {
			cache[path] = _.template(str);
			str = cache[path](options);
		} catch (e) {
			return callback(e);
		}
		return callback(null, str);
	});
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

	db.scores.save(id+':'+revision, code, version, function(err) {
		if (err) {
			return res.send(err, 500);
		}
		res.send({id: id, revision: revision});
	});
});

app.post('/prepare_preview', function(req, res) {
	var code = req.body.code,
		id = req.body.id || Math.random().toString(36).substring(2, 8),
		version = req.body.version || 'stable',
		tempSrc = __dirname + '/render/' + id + '.ly';

	fs.writeFile(tempSrc, code, function(err) {
		if (err) throw err;
		var start = new Date().getTime();
		exec(config.bin[version] + ' --formats=pdf,png -o ' + __dirname + '/render/' + id + ' ' + tempSrc, function(err, stdout, stderr) {
			if (err) {
				res.send({
					error: stderr,
					id: id,
					pages: 0
				});
				return;
			}
			fs.stat(__dirname + '/render/' + id + '.png', function(err, stats) {
				if (!err && stats) {
					fs.rename(__dirname + '/render/' + id + '.png', __dirname + '/render/' + id + '-page1' + '.png', function (err) {
						if (err) {
							res.status(500).send('Internal server error: file rename failed');
							console.error(err);
							return;
						}
						res.send({
							output: stderr,
							id: id,
							pages: 1
						});
					})
				}
				else {
					function recurseStat(page) {
						fs.stat(__dirname + '/render/' + id + '-page' + page + '.png', function (err, stats) {
							if (!err) return recurseStat(++page);
							res.send({
								output: stderr,
								id: id,
								pages: page - 1
							});
						});
					}
					recurseStat(1);
				}
			});
		});
	});
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

	db.scores.get(id+':'+revision, function(err, score) {
		if (!score) return next();
		score.id = id;
		score.revision = revision;
		res.render('index.html', {
			score: JSON.stringify(score), versions: versions});
	});
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
