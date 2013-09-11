
var Transform = require('../../Transform');
var util = require('util');
var workerFarm = require('worker-farm');
var workers = require(require.resolve('./worker'));
var transformCache = require('../../helper/transformCache');
var isType = require('../../helper/isType');

function minifyJavaScriptAsset(cache, asset, callback) {
	if ('minified' in asset.content) {
		return callback(null, asset);
	}

	cache.get(asset, function(error, cachedAsset) {
		if (!error && cachedAsset && 'minified' in cachedAsset.content) {
			return callback(null, cachedAsset);
		}

		workers(asset, function(error, transformedAsset) {
			if (error) return callback(error);

			cache.put(asset, transformedAsset, function(error) {
				callback(null, transformedAsset);
			});
		});

	});
}

module.exports = Transform.create(function(options) {
	options = options || {};
	var cache = options.cache || transformCache.nullCache;

	return function(asset, callback) {
		if (asset.event === 'update' && isType.javaScript(asset)) {
			minifyJavaScriptAsset(cache, asset, callback);
		} else {
			callback(null, asset);
		}
	};
});

module.exports.minifyJavaScriptAsset = minifyJavaScriptAsset;
