
var Transform = require('../Transform');
var isTextAsset = require('../helper/isTextAsset');
var contentSize = require('../helper/contentSize');
var transformCache = require('../helper/transformCache');
var zlib = require('zlib');

function compressTextAsset(cache, asset, callback) {
	if ('gzip' in asset.content) {
		return callback(null, asset);
	}

	var startTime;
	var compressions = 0;

	function compressionDone() {
		if (++compressions !== 2) return;

		var dataSize = contentSize(asset);
		var gzipSize = contentSize(asset, 'gzip');
		var deflateSize = contentSize(asset, 'deflate');

		var endTime = new Date();
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

		asset.transforms = asset.transforms || [];
		asset.transforms.push(transform);

		cache.put(asset, asset, function(error) {
			callback(null, asset);
		});
	}

	cache.get(asset, function(error, cachedAsset) {
		if (!error && cachedAsset && 'gzip' in cachedAsset.content) {
			return callback(null, cachedAsset);
		}

		startTime = new Date();

		zlib.gzip(asset.content.data, function(error, gzip) {
			if (error) {
				console.error('Gzip error:', error.stack || error);
				// Ignoring error. TODO: What to do?
			} else {
				asset.content.gzip = gzip;
			}
			compressionDone();
		});

		zlib.deflate(asset.content.data, function(error, deflate) {
			if (error) {
				console.error('Deflate error:', error.stack || error);
				// Ignoring error. TODO: What to do?
			} else {
				asset.content.deflate = deflate;
			}
			compressionDone();
		});

	});
}

module.exports = Transform.create(function(options) {
	options = options || {};
	var cache = options.cache || transformCache.nullCache;

	return function(asset, callback) {
		if (asset.event === 'update' && isTextAsset(asset)) {
			compressTextAsset(cache, asset, callback);
		} else {
			callback(null, asset);
		}
	};
});

module.exports.compressTextAsset = compressTextAsset;
