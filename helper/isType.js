
var isType = exports;

isType.matching = function(asset, regexp) {
	if (!(asset && asset.content && asset.content.type)) {
		return false;
	} else {
		return regexp.test(asset.content.type);
	}
};

isType.javaScript = function(asset) {
	return isType.matching(asset, (/\bjavascript\b/i));
};
