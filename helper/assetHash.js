
var crypto = require('crypto');

module.exports = function(asset, callback) {
	if (!asset) return callback(new Error('Asset is undefined.'));
	if (!asset.content) return callback(new Error('Asset has no content defined.'));
	if (!asset.content.data) return callback(new Error('Asset has no content data.'));

	asset.content.hash = asset.content.hash || {};

	if (!asset.content.hash.sha1) {
		try {
			asset.content.hash.sha1 = crypto.createHash('sha1').update(asset.content.data).digest('base64');
		} catch (error) {
			return callback(error);
		}
	}
	asset.content.hash.key = 'sha1:' + asset.content.hash.sha1;

	callback(null, asset);
};
