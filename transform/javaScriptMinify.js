
var Transform = require('../Transform');
var util = require('util');
var workerFarm = require('worker-farm');
var workers = workerFarm(require.resolve('./javaScriptMinifyWorker'));
var transformCache = require('../helper/transformCache');
var isType = require('../helper/isType');

module.exports = Transform.create(function(options) {
	options = options || {};
	var cache = options.cache || transformCache.nullCache;

	return function(asset, callback) {
		if (!(isType.javaScript(asset) && asset.event === 'update')) {
			callback(null, asset);
			return;
		}

		cache.get(asset, function(error, cachedAsset) {
			if (error || !cachedAsset) {
				workers(asset, function(error, transformedAsset) {
					if (error) return callback(error);

					cache.put(asset, transformedAsset, function(error) {
						callback(null, transformedAsset);
					});
				});
			} else {
				callback(null, cachedAsset);
			}
		});
	};
});
