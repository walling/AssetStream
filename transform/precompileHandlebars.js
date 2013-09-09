
var Transform = require('../Transform');
var isType = require('../helper/isType');
var Handlebars = require('handlebars');
var path = require('path');

function precompileHandlebarsAsset(asset, callback) {
	var startTime = new Date();

	var partialName = path.basename(
		asset.path.replace(/\.(?:hbs|handlebars)$/, '')
	);

	var javaScript = (
		'// Pre-compiled Handlebars template: ' + asset.path + '\n' +
		'\n' +
		'var Handlebars = require(\'handlebars-runtime\');\n' +
		'\n' +
		'module.exports = Handlebars.partials[' + JSON.stringify(partialName) + '] = ' +
		'Handlebars.template(' + Handlebars.precompile(asset.content.data) + ');\n'
	);

	var endTime = new Date();
	var transformedAsset = {
		event: 'update',
		path: asset.path + '.js',
		content: {
			type: 'application/javascript',
			data: javaScript
		},
		transforms: (asset.transforms || []).concat({
			name: 'precompileHandlebars',
			time: endTime - startTime
		})
	};

	callback(null, transformedAsset);
}

module.exports = Transform.create(function() {
	return function(asset, callback) {
		callback(null, asset);

		if (asset.event === 'update' && isType.handlebars(asset)) {
			precompileHandlebarsAsset(asset, callback);
		}
	};
});
