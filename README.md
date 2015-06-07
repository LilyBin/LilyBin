LilyBin
=======

[![Dependency status](https://img.shields.io/david/LilyBin/LilyBin.svg)](https://david-dm.org/LilyBin/LilyBin)

LilyBin is a web-based [LilyPond](http://www.lilypond.org) editor. See it live
at [http://lilybin.com](http://lilybin.com).

Submit bugs and feature requests as GitHub issues.

### Running LilyBin

Install [Node.js](https://nodejs.org/) and
[Docker](https://docs.docker.com/installation/).

Clone the repository and run `npm install` to download required node modules.

Run `docker pull trevordixon/lilypond` to fetch the Docker image containing the
latest versions of LilyPond. (LilyBin uses Docker to compile scores in a
sandboxed environment. It looks for a Docker image named `trevordixon/lilypond`
and runs each compilation in a new container.)

The Dockerfile used to build that image is located at
[trevordixon/docker-lilypond](https://github.com/trevordixon/docker-lilypond).

Launch LilyBin with `node server.js`. Navigate to
[http://localhost:3001](http://localhost:3001), and you should be presented
with an editor pane and a successfully rendered score.
