
var deserializeAsset = require('./deserializeAsset');
var serializeAsset = require('./serializeAsset');
var assetHash = require('./assetHash');

function createTransformCache(db) {

	function get(asset, callback) {
		assetHash(asset, function(error, asset) {
			if (error) return callback(error);

			db.get(asset.content.hash.key, function(error, cachedAsset) {
				if (error) return callback(error);

				callback(null, deserializeAsset(cachedAsset));
			});
		});
	}

	function put(asset, transformedAsset, callback) {
		assetHash(asset, function(error, asset) {
			if (error) return callback(error);

			transformedAsset.transforms = (transformedAsset.transforms || []).concat([{
				name: 'transformCache',
				key: asset.content.hash.key
			}]);

			db.put(asset.content.hash.key, serializeAsset(transformedAsset), callback);
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
