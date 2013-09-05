
var util = require('util');

function serializeAsset(asset) {
	if (!(asset && asset.content)) return null;

	asset = util._extend({}, asset);
	asset.content = util._extend({}, asset.content);

	for (var key in asset.content) {
		if (Buffer.isBuffer(asset.content[key])) {
			asset.content[key] = {
				$buffer: asset.content[key].toString('base64')
			};
		}
	}

	return asset;
}

module.exports = serializeAsset;
