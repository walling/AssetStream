
var Transform = require('../Transform');
var isTextAsset = require('../helper/isTextAsset');
var contentSize = require('../helper/contentSize');
var transformCache = require('../helper/transformCache');
var zlib = require('zlib');

module.exports = Transform.create(function(options) {
	options = options || {};
	var cache = options.cache || transformCache.nullCache;

	return function(asset, callback) {
		if (!(isTextAsset(asset) && asset.event === 'update')) {
			if ((/javascript/i).test(asset.content.type)) {
				console.log(asset);
				process.exit(1);
			}
			callback(null, asset);
			return;
		}

		cache.get(asset, function(error, cachedAsset) {
			if (error || !cachedAsset) {

				var startTime = new Date();
				var compressed = 0;

				function compressingDone() {
					if (compressed !== 2) return;

					var dataSize = contentSize(asset);
					var gzipSize = contentSize(asset, 'gzip');
					var deflateSize = contentSize(asset, 'deflate');
					var transform = {
						name: 'compressText',
						time: endTime - startTime,
						gzipRatio: dataSize ? (gzipSize / dataSize) : 0,
						deflateRatio: dataSize ? (deflateSize / dataSize) : 0
					};

					if (transform.gzipRatio > 1) {
						asset.content.gzip = null;
					}

					if (transform.deflateRatio > 1) {
						asset.content.deflate = null;
					}

					var endTime = new Date();
					asset.transforms = asset.transforms || [];
					asset.transforms.push(transform);

					cache.put(asset, asset, function(error) {
						callback(null, asset);
					});
				}

				zlib.gzip(asset.content.data, function(error, gzip) {
					compressed++;

					if (error) {
						console.error('Gzip error:', error.stack || error);
						// Ignoring error. TODO: What to do?
						return compressingDone();
					}

					asset.content.gzip = gzip;
					compressingDone();
				});

				zlib.deflate(asset.content.data, function(error, deflate) {
					compressed++;

					if (error) {
						console.error('Deflate error:', error.stack || error);
						// Ignoring error. TODO: What to do?
						return compressingDone();
					}

					asset.content.deflate = deflate;
					compressingDone();
				});

			} else {
				callback(null, cachedAsset);
			}
		});
	};
});
