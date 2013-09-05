
var Readable = require('stream').Readable;
var util = require('util');

util.inherits(AssetSource, Readable);
function AssetSource(options) {
	var self = this;

	options = util._extend({}, options);
	options.objectMode = true;
	Readable.call(self, options);

	self.source = options.source || null;
	self._assets = undefined;

	function initializeSource() {
		var source = self.source;

		if (self._assets && source) {
			if (typeof(source) !== 'function') {
				self.emit('error', new TypeError('The source argument must be a function.'));
				return;
			}

			self.removeListener('_source', initializeSource);

			source(function(error, asset) {
				if (error) {
					self.emit('error', error);
				} else if (self._assets) {
					var lastIndex = self._assets.length - 1;
					if (lastIndex < 0 || self._assets[lastIndex]) {
						self._assets.push(asset || null); // TODO: Convert to readable stream
						self.emit('_asset');
					}
				}
			});
		}
	}

	self.on('_source', initializeSource);
}

AssetSource.prototype._read = function(size) {
	var self = this;

	if (self._assets === undefined) {
		self._assets = [];
		self.emit('_source');
	}

	if (!self._assets) {
		self.push(null);
	} else if (self._assets.length > 0) {
		if (!self.push(self._assets.shift() || null)) {
			self._assets = null;
		}
	} else {
		self.once('_asset', function() {
			self._read(size); // TODO: Use process.nextTick here?
		});
	}
};

AssetSource.create = function(source) {
	function sourceFactory() {
		var assetSource = new AssetSource();
		assetSource.source = source.apply(assetSource, arguments);
		assetSource.emit('_source');
		return assetSource;
	}
	sourceFactory.on = sourceFactory.pipe = function() {
		throw new Error('You have to create an instance of this pipe before using it.');
	};
	return sourceFactory;
};

module.exports = AssetSource;
