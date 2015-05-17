var Promise = require('bluebird');
var Docker = require('dockerode');
var through = require('through');

var docker = new Docker();

function exec(cmd, vol) {
  return new Promise(function(resolve, reject) {
    var out = '';
    var stream = through(function write(data) {
      this.emit('data', data);
      out += data;
    });

    var startOpts, runOpts;
    if (vol) {
      startOpts = {Volumes: {}};
      startOpts.Volumes[vol.as] = {};
      runOpts = {Binds: [vol.mount + ':' + vol.as]};
    }

    docker.run(
      'trevordixon/lilypond',
      cmd,
      stream,
      startOpts,
      runOpts,
      function (err, data, container) {
        if (err) reject(err);

        if (data.StatusCode === 0)
          resolve(out);
        else reject(out);

        container.remove(function(err, data) {
          if (err) console.error('Error removing container:', err);
        });
      }
    );
  });

}

module.exports = {
  compile: function(mountDir, scorePath, version) {
    version = (version === 'unstable') ? 'unstable' : 'stable';

    return exec([
      '/root/' + version + '/bin/lilypond',
      '--formats=pdf,png',
      '-o', '/score/rendered',
      '/score/' + scorePath,
    ], {
      mount: mountDir,
      as: '/score'
    });
  },

  versions: function() {
    var p1 = exec(['/root/stable/bin/lilypond', '-v']);
    var p2 = exec(['/root/unstable/bin/lilypond', '-v']);
    return Promise.all([p1, p2]).then(function(o) {
      var versions = {};
      versions.stable = o[0].match(/^GNU LilyPond (.*)$/m)[1];
      versions.unstable = o[1].match(/^GNU LilyPond (.*)$/m)[1];
      return versions;
    });
  },
};
