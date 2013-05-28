LilyBin
=======

LiliyBin is a web-based [LilyPond](http://www.lilypond.org) editor. See it live at [http://lilybin.com](http://lilybin.com).

Feel free to help me clean up the messy code I produced in my early NodeJS days. I plan to rewrite LilyBin soon, probably in Go.

Submit bugs and feature requests as GitHub issues.

### To run locally

LilyBin requires that NodeJS and MongoDB be installed on the server to run.

Clone the repository, and edit config.json so that bin.stable is the path to the "stable" LilyPond binary and bin.unstable is the path to the unstable binary. Ensure MongoDB is running locally, and launch LilyBin with `node server.js`.
