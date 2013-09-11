
var Transform = require('../Transform');
var isType = require('../helper/isType');
var less = require('less');
var path = require('path');
var mkdirp = require('mkdirp');
var fs = require('fs');
var execFile = require('child_process').execFile;

function errorMessage(error, filename) {
	if (error.line) {
		filename += ':' + error.line;
		if (error.column) {
			filename += ':' + (error.column + 1);
		}
	}

	var message = '' + [error.message];
	if (!message) {
		message = JSON.stringify(error);
	}

	return {
		filename: filename,
		line: error.line || undefined,
		column: error.column ? (error.column + 1) : undefined,
		message: filename + ': ' + message
	};
}

function errorCSS(message) {
	var css =
		'body:before {\n' +
		'\tposition: fixed;\n' +
		'\tz-index: 100000;\n' +
		'\tcontent: ' + JSON.stringify(message) + ';\n' +
		'\ttop: 0;\n' +
		'\tleft: 0;\n' +
		'\tright: 0;\n' +
		'\tpadding: 10px;\n' +
		'\tbackground-color: #900;\n' +
		'\tcolor: #fff;\n' +
		'\tborder-bottom: 2px solid #600;\n' +
		'}\n';
	return css;
}

module.exports = Transform.create(function(options) {
	var filename = options.filename;
	var filenameCSS = filename.replace(/\.less$/, '') + '.css';
	var cachedCSS;

	var compileLastTime = Date.now();
	var compileTimer = 0;
	var compileCallback = null;

	function compileAsset() {
		clearTimeout(compileTimer);
		compileTimer = 0;

		var now = Date.now();
		var remainingTime = 1000 - (now - compileLastTime);
		if (remainingTime > 0) {
			compileTimer = setTimeout(compileAsset, remainingTime);
			return;
		}
		compileLastTime = now;

		var virtualPath = '/tmp/assetstream-less' + filename;
		execFile(
			path.resolve(__dirname, '../node_modules/.bin/lessc'),
			[virtualPath],
			function(error, stdout, stderr) {
				if (error) {
					var message = error.message.
						replace(/\u001b\[\d+m/g, '').
						replace(/\n+/g, ' ').
						replace(/ +/g, ' ').
						replace(/^Command failed:/, '').
						trim();
					compileCallback(new Error(message || 'File not found or other error for ' + filename));
				} else {
					compileCallback(null, stdout);
				}
			}
		);
	}

	function updateAsset(asset, callback) {
		compileCallback = callback;

		if (asset.content && Buffer.isBuffer(asset.content.data)) {
			asset.content.data = asset.content.data.toString();
		}

		var virtualPath = '/tmp/assetstream-less' + asset.path;
		mkdirp(path.dirname(virtualPath), function(error) {
			if (error) return compileCallback(error);

			if (asset.event === 'delete') {
				fs.unlink(virtualPath, function(){});
			} else {
				fs.writeFile(virtualPath, asset.content.data, function(error) {
					clearTimeout(compileTimer);
					compileTimer = setTimeout(compileAsset, 100);
				});
			}
		});
	}

	return function(asset, callback) {
		callback(null, asset);

		if (isType.less(asset)) {
			updateAsset(asset, function(error, css) {
				if (error) {
					css = errorCSS(error.message);
				}

				if (cachedCSS !== css) {
					cachedCSS = css;

					callback(null, {
						event: 'update',
						path: filenameCSS,
						content: {
							type: 'text/css',
							data: ('' + [css]) || '// empty\n'
						},
						transforms: [{
							name: 'compileLess',
							warnings: error ? [error] : undefined
						}]
					});
				}
			});
		}
	};
});
