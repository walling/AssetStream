
var Transform = require('stream').Transform;
var util = require('util');

util.inherits(AssetTransform, Transform);
function AssetTransform(options) {
	var self = this;

	options = util._extend({}, options);
	options.objectMode = true;
	Transform.call(self, options);

	self.transform = options.transform || null;
	if (self.transform) {
		self.emit('_transform');
	}
}

AssetTransform.prototype._transform = function(asset, encoding, next) {
	var self = this;

	if (self.transform) {
		self.transform(asset || null, function(error, transformedAsset) {
			if (error) {
				self.emit('error', error);
			}
			if (transformedAsset) {
				self.push(transformedAsset);
			}
		});
		next();
	} else {
		self.once('_transform', function() {
			self._transform(asset, encoding, next);
		});
	}
};

AssetTransform.create = function(transform) {
	function transformFactory() {
		var assetTransform = new AssetTransform();
		assetTransform.transform = transform.apply(assetTransform, arguments);
		assetTransform.emit('_transform');
		return assetTransform;
	}
	transformFactory.on = transformFactory.pipe = function() {
		throw new Error('You have to create an instance of this pipe before using it.');
	};
	return transformFactory;
};

module.exports = AssetTransform;
