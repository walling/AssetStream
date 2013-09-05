
var Source = require('../Source');
var isTextAsset = require('../helper/isTextAsset');
var miniwatch = require('miniwatch');
var mime = require('mime');
var path = require('path');
var fs = require('fs');

module.exports = Source.create(function(options) {
	return function(callback) {
		miniwatch(options, function(error, files) {
			if (error) {
				callback(error);
				return;
			}

			// TODO: Quick-fix until miniwatch gets this support.
			files.directory = typeof(options) === 'string' ? options : options.directory;

			var updated = {};

			if (files.updated) {
				files.updated.forEach(function(filename) {
					updated[filename] = true;
				});
			}

			if (files.created) {
				files.created.forEach(function(filename) {
					updated[filename] = true;
				});
			}

			if (files.deleted) {
				files.deleted.forEach(function(filename) {
					callback(null, {
						event: 'delete',
						path: '/' + filename
					});
				});
			}

			Object.keys(updated).forEach(function(filename) {
				fs.readFile(path.join(files.directory, filename), function(error, content) {
					if (error) return callback(error);

					filename = '/' + filename;

					var asset = {
						event: 'update',
						path: filename,
						content: {
							type: mime.lookup(filename)
						}
					};
					asset.content.data = isTextAsset(asset) ? content.toString('utf8') : content;

					callback(null, asset);
				});
			});
		});
	};
});
