// Load Express
var express = require('express'),
	Db = require('mongodb').Db,
	Connection = require('mongodb').Connection,
	Server = require('mongodb').Server,
	mongo = new Db('LilyPond', new Server('localhost', Connection.DEFAULT_PORT, {}), {}),
	app = express.createServer(),
	MongoStore = require('connect-mongodb'),
	sessionStore = new MongoStore({db: mongo}),
	exec = require('child_process').exec,
	fs = require('fs'),
	path = require('path'),
	_ = require('underscore'),
	db = require('./app_modules/db'),
	DropboxClient = require('dropbox'),
	OAuth = require('oauth').OAuth;
	
// Serve static files from ./htdocs
app.use(express.static(__dirname + '/htdocs'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({store: sessionStore, secret: '3891jasl', cookie: {path: '/', httpOnly: true, maxAge: 2592000000}}));

// Use underscore.js for templating.
app.register('.html', {
	compile: function(str, options) {
		var template = _.template(str);
		return function (locals) {
			return template(locals);
		};
	}
});


// Dropbox
var consumerKey = process.env.DBOX_KEY,
	consumerSecret = process.env.DBOX_SECRET,
	dropboxClients = {};

// Get config options
var config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf-8'));

app.set('view options', {
	layout: false
});

app.set('views', __dirname + '/views');

db.connect(mongo, function(db) {

	app.get('/dropbox_logout', function(req, res) {
		delete dropboxClients[req.session.uid];
		req.session.destroy(function(err) {
			res.redirect('/');
		});
	});

	app.get('/dropbox_login', function(req, res) {
		var dropbox = dropboxClients[req.sessionID] = new DropboxClient({
			consumerKey: consumerKey,
			consumerSecret: consumerSecret,
			sandbox: true
		});
		
		dropbox.getRequestToken(function(err, requestToken, requestTokenSecret) {
			if (err) console.log('error', err);
			else {
				res.redirect('https://www.dropbox.com/1/oauth/authorize?oauth_token=' + requestToken + '&oauth_callback=http://' + req.headers.host + '/get_dropbox_access');
			}
		});
	});
	
	app.get('/get_dropbox_access', function(req, res) {
		var dropbox = dropboxClients[req.sessionID];
		
		dropbox.getAccessToken(function(err, accessToken, accessTokenSecret, results) {
			delete dropboxClients[req.sessionID];
			
			req.session.uid = results.uid;
			req.session.accessToken = accessToken;
			req.session.accessTokenSecret = accessTokenSecret;
			
			dropboxClients[results.uid] = dropbox;

			dropbox.getAccountInfo(function(err, info) {
				req.session.accountInfo = info;
				res.redirect('/');
			});
		});
	})

	app.get('/dropbox_metadata', function(req, res) {
		var dropbox = dropboxClients[req.session.uid] || (dropboxClients[req.session.uid] = new DropboxClient({
			consumerKey: consumerKey,
			consumerSecret: consumerSecret,
			accessToken: req.session.accessToken,
			accessTokenSecret: req.session.accessTokenSecret,
			sandbox: true
		}));
		
		dropbox.getMetadata(req.query.path || '/', {}, function(err, response) {
			res.send(response);
		});
	});

	app.get('/dropbox_file', function(req, res) {
		var dropbox = dropboxClients[req.session.uid] || (dropboxClients[req.session.uid] = new DropboxClient({
			consumerKey: consumerKey,
			consumerSecret: consumerSecret,
			accessToken: req.session.accessToken,
			accessTokenSecret: req.session.accessTokenSecret,
			sandbox: true
		}));
		
		dropbox.getFile(req.query.path, {}, function(err, body, response) {
			res.send(body, response.statusCode);
		});
	});
	
	app.post('/dropbox_save', function(req, res) {
		var dropbox = dropboxClients[req.session.uid] || (dropboxClients[req.session.uid] = new DropboxClient({
			consumerKey: consumerKey,
			consumerSecret: consumerSecret,
			accessToken: req.session.accessToken,
			accessTokenSecret: req.session.accessTokenSecret,
			sandbox: true
		}));
		
		dropbox.putFile(req.body.path, req.body.contents, 'text/lilypond', function(err, response) {
			res.send(response, response.statusCode);
		});
	});

	// Routes
	app.get('/js/*', function(req, res, next) {
		next();
	});
	
	app.get('/css/*', function(req, res, next) {
		next();
	});
	
	app.get('/favicon.ico', function(req, res, next) {
		next();
	});
	
	app.post('/save', function(req, res) {
		var code = req.body.code,
			id = req.body.id || Math.random().toString(36).substring(2, 8),
			version = req.body.version || 'stable',
			tempSrc = __dirname + '/src/' + id + '.ly';
		
		db.scores.save({id: id, code: code, version: version}, function(err, revision) {
			res.send({id: id, revision: revision});
		});
		
		//db.log({action: 'save', ip: ipAddr(req), id: id, version: version});
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

					//db.log({action: 'prepare preview', ip: ipAddr(req), id: id, version: version, error: err, duration: new Date().getTime() - start});
					return;
				}
				fs.stat(__dirname + '/render/' + id + '.png', function(err, stats) {
					if (!err && stats) {
						fs.renameSync(__dirname + '/render/' + id + '.png', __dirname + '/render/' + id + '-page1' + '.png');
						res.send({
							output: stderr,
							id: id,
							pages: 1
						});

						//db.log({action: 'prepare preview', ip: ipAddr(req), id: id, version: version, pages: 1, duration: new Date().getTime() - start});
					}
					else {
						var pages = 0, stats;
						try { while (stats = fs.statSync(__dirname + '/render/' + id + '-page' + ++pages + '.png')); }
						catch (e) { }
						res.send({
							output: stderr,
							id: id,
							pages: pages - 1
						});
	
						//db.log({action: 'prepare preview', ip: ipAddr(req), id: id, version: version, pages: pages - 1, duration: new Date().getTime() - start});
					}
				});
			});
		});
	});

	app.get('/preview', function(req, res) {
		var id = req.param('id'),
			page = req.param('page') || 1;
		
		res.sendfile(__dirname + '/render/' + id + '-page' + page + '.png');

		//db.log({action: 'preview', ip: ipAddr(req), id: id, page: page});
	});

	app.get('/downloadPDF', function(req, res) {
		var id = req.param('id');
		
		res.download(__dirname + '/render/' + id + '.pdf', 'score.pdf');

		//db.log({action: 'preview', ip: ipAddr(req), id: id});
	});
	
	app.get('/downloadMidi', function(req, res) {
		var id = req.param('id');
		
		res.download(__dirname + '/render/' + id + '.midi', 'score.midi');

		//db.log({action: 'preview', ip: ipAddr(req), id: id});
	});
	
	app.get('/:id?/:revision?', function(req, res, next) {
		var id = req.param('id'),
			revision = req.param('revision') || 1;
	
		db.scores.get({id: id || 'default', revision: revision}, function(err, score) {
			if (!score) return next();
			score.id = id;
			score.revision = revision;
			res.render('index.html', {score: JSON.stringify(score), accountInfo: req.session.accountInfo || 'null'});

			//db.log({action: 'page view', ip: ipAddr(req), id: id, revision: revision});
		});
	});

	app.get('/install', function(req, res) {
		db.scores.save({id: 'default', code: '', version: '1'}, function(err, revision) {
			res.send({id: 'default', revision: '1'});
		});
	});

});

var port;
app.listen(port = process.env.LISTEN_PORT || 3001);
console.log("Listening on port " + port + ".");

function ipAddr(req) {
	var ip = null;
	try {
		ip = req.headers['x-forwarded-for'];
	}
	catch ( error ) {
		ip = req.connection.remoteAddress;
	}
	return ip;
}
