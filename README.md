LilyBin
=======

LiliyBin is a web-based [LilyPond](http://www.lilypond.org) editor. See it live at [http://lilybin.com](http://lilybin.com).

Submit bugs and feature requests as GitHub issues.

### To run locally

Install Node.js and LilyPond before running LilyBin.

Clone the repository and run `npm install` to download required node modules.

Next, edit config.json so that `bin.stable` is the path to the "stable" LilyPond binary,
and `bin.unstable` is the path to the unstable binary. Launch LilyBin
with `node server.js`. Navigate to http://localhost:3001, and you should
be presented with an editor pane and a successfully rendered score.
