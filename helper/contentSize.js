
function contentSize(asset, key) {
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
