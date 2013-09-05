
var assetHash = require('./assetHash');

function createTransformCache(db) {

	function get(asset, callback) {
		assetHash(asset, function(error, asset) {
			if (error) return callback(error);

			db.get(asset.content.hash.key, callback);
		});
	}

	function put(asset, transformedAsset, callback) {
		assetHash(asset, function(error, asset) {
			if (error) return callback(error);

			transformedAsset.transforms = (transformedAsset.transforms || []).concat([{
				name: 'transformCache'
			}]);

			db.put(asset.content.hash.key, transformedAsset, callback);
		});
	}

	return {
		get: get,
		put: put
	};
}

function createNullCache() {

	function get(asset, callback) {
		callback();
	}

	function put(asset, transformedAsset, callback) {
		callback();
	}

	return {
		get: get,
		put: put
	};
}

exports.create = createTransformCache;
exports.nullCache = createNullCache();
