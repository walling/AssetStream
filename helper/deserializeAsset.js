
var util = require('util');

function deserializeAsset(asset) {
	if (!(asset && asset.content)) return null;

	for (var key in asset.content) {
		if (asset.content[key] && asset.content[key].$buffer) {
			asset.content[key] = new Buffer(asset.content[key].$buffer, 'base64');
		}
	}

	return asset;
}

module.exports = deserializeAsset;
