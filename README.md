LilyBin
=======

LilyBin is a web-based [LilyPond](http://www.lilypond.org) editor. See it live
at [http://lilybin.com](http://lilybin.com).

Submit bugs and feature requests as GitHub issues.

### Running LilyBin

Install [Node.js](https://nodejs.org/) and
[Docker](https://docs.docker.com/installation/).

Clone the repository and run `npm install` to download required node modules.

Run `docker build -t lilybin .` to create a Docker image named lilybin based on
the included Dockerfile. (LilyBin uses Docker to compile scores in a sandboxed
environment. It looks for a Docker image named lilybin and runs each compilation
in a new container.)

Launch LilyBin with `node server.js`. Navigate to http://localhost:3001, and you
should be presented with an editor pane and a successfully rendered score.
