var cp = require('child_process');
var fs = require('fs');
var Promise = require('bluebird');
var Docker = require('dockerode');
var path = require('path');
var through = require('through');

var docker = new Docker();

module.exports = function(scorePath, version) {
  version = (version === 'unstable') ? 'unstable' : 'stable';

  var dirname = path.dirname(scorePath);
  var basename = path.basename(scorePath);

  return new Promise(function(resolve, reject) {
    var out = '';
    var stream = through(function write(data) {
      this.emit('data', data);
      out += data;
    });

    docker.run(
      'lilybin',
      ['/root/stable/bin/lilypond', '--formats=pdf,png', '-o', '/score/rendered', '/score/' + basename],
      stream,
      {
        Volumes: {
          '/score': {}
        }
      },
      {
        Binds: [dirname + ':/score']
      },
      function (err, data, container) {
        if (err) reject(err);

        if (data.StatusCode === 0)
          resolve(out);
        else reject(out);

        container.remove(function(err, data) {
          if (err) console.error(err);
        });
      }
    );
  });
};
