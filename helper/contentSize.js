
function contentSize(asset, key) {
	if (typeof(asset) === 'string') {
		return Buffer.byteLength(asset);
	} else if (Buffer.isBuffer(asset)) {
		return asset.length;
	}

	key = key || 'data';

	if (!(asset && asset.content && asset.content[key])) {
		return 0;
	}

	var data = asset.content[key];
	if (typeof(data) === 'string') {
		return Buffer.byteLength(data);
	} else {
		return data.length | 0;
	}
}

module.exports = contentSize;
