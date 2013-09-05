
var textTypes = /\btext\b|\bjavascript\b|\bjson\b|\bxml\b|\bhtml\b|\bcss\b/i;

function isTextAsset(asset) {
	if (asset && asset.content) {
		if (asset.content.data) {
			return typeof(asset.content.data) === 'string';
		} else {
			return textTypes.test(asset.content.type);
		}
	} else {
		return false;
	}
}

module.exports = isTextAsset;
