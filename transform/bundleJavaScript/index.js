
var Transform = require('../../Transform');
var isType = require('../../helper/isType');
var UglifyJS = require('uglify-js');
var fs = require('fs');
var path = require('path');
var SourceMapConsumer = require('source-map').SourceMapConsumer;
var SourceMapGenerator = require('source-map').SourceMapGenerator;

var _loader = (function() {
	var src = fs.readFileSync(require.resolve('./loader'), 'utf8');

	var loader = UglifyJS.minify(src, {
		fromString: true,
		outSourceMap: '/loader.js'
	});

	loader.src = src;
	return loader;
}());

function createLoader(loaderPath) {
	loaderPath = loaderPath || '/loader.js';

	var map = JSON.parse(_loader.map);
	map.file = loaderPath;
	map.sources = [loaderPath];

	return {
		event: 'update',
		path: loaderPath,
		content: {
			type: 'application/javascript',
			data: _loader.src,
			minified: _loader.code,
			sourceMap: map,
			dependencies: []
		}
	};
}

function loadJavaScriptAsset(asset) {
	var mappings = [];
	var map = new SourceMapConsumer(asset.content.sourceMap);
	map.eachMapping(function(mapping) {
		mappings.push(mapping);
	});

	return {
		mappings: mappings,
		numberOfLines: asset.content.minified.split('\n').length,
		asset: asset
	};
}


function addModuleSourceMap(generator, module) {
	var lineOffset = generator.lineOffset;
	var mappings = module.mappings;

	for (var i = 0; i < mappings.length; i++) {
		var inputMapping = mappings[i];
		var outputMapping = {
			generated: {
				line: inputMapping.generatedLine + lineOffset,
				column: inputMapping.generatedColumn
			},
			original: {
				line: inputMapping.originalLine,
				column: inputMapping.originalColumn
			},
			source: inputMapping.source,
			name: inputMapping.name
		};

		generator.addMapping(outputMapping);
	}

	generator.lineOffset += module.numberOfLines;
	return generator;
}

module.exports = Transform.create(function(options) {
	options = options || {};
	var entryPath = ('' + [options.entryPath]) || '/app.js';
	var outputPath = ('' + [options.outputPath]) || (entryPath.replace(/\.js$/, '') + '.bundle.js');
	var outputMapPath = ('' + [options.outputMapPath]) || (outputPath + '.map');
	var loaderPath = ('' + [options.loaderPath]) || '/loader.js';
	var loader = null;
	var modules = {};

	var bundleHasBeenBuilt = false;
	var bundleErrors = [];

	var bundleLastTime = Date.now();
	var bundleTimer = 0;
	var bundleCallback;

	function resolvePath(currentPath, requirePath) {
		if (/^\.+\//.test(requirePath)) {
			requirePath = path.resolve(path.dirname(currentPath), requirePath);
		}

		if (/^\//.test(requirePath)) {
			return modules[requirePath + '.js'] || modules[requirePath];
		} else {
			var segments = path.dirname(currentPath).replace(/^\//, '').split('/');
			segments.unshift('');

			for (var i = segments.length; i > 0; i--) {
				var commonPath = segments.slice(0, i).join('/') + '/node_modules/' + requirePath;
				var requiredModule =
					modules[commonPath + '.js'] ||
					modules[commonPath + '/index.js'] ||
					modules[commonPath];

				if (requiredModule) {
					return requiredModule;
				}
			}
		}
	}

	function bundleError(message) {
		var error = new Error(message);
		if (bundleHasBeenBuilt) {
			bundleCallback(error);
		} else {
			bundleErrors.push(error);
			if (!bundleTimer) {
				bundleTimer = setTimeout(function() {
					bundleErrors.forEach(function(error) {
						bundleCallback(error);
					});
				}, 2000);
			}
		}
	}

	function createBundle() {
		clearTimeout(bundleTimer);
		bundleTimer = 0;
		bundleErrors = [];

		var now = Date.now();
		var remainingTime = 100 - (now - bundleLastTime);
		if (remainingTime > 0) {
			bundleTimer = setTimeout(createBundle, remainingTime);
			return;
		}

		bundleLastTime = now;
		var startTime = now;

		var entryModule = resolvePath('/', entryPath);
		if (!entryModule) {
			return bundleError('Could not find JS entry module: ' + entryPath);
		}

		var usedModules = {};
		var missingModules = [entryModule];

		while (missingModules.length > 0) {
			var module = missingModules.shift();
			usedModules[module.asset.path] = module;

			module.dependencies = {};
			var requirePaths = module.asset.content.dependencies;
			for (var i = 0; i < requirePaths.length; i++) {
				var requirePath = requirePaths[i];
				var requireModule = resolvePath(module.asset.path, requirePath);
				if (!requireModule) {
					return bundleError('In module ' + module.asset.path + ' could not find required module: ' + requirePath);
				}

				module.dependencies[requirePath] = requireModule;
				if (!(requireModule.asset.path in usedModules)) {
					missingModules.push(requireModule);
				}
			}
		}

		usedModules = Object.keys(usedModules).map(function(modulePath, index) {
			var module = usedModules[modulePath];
			module.index = index;
			return module;
		});

		var bundleSourceMap = new SourceMapGenerator({
			file: outputPath
		});
		bundleSourceMap.lineOffset = 0;
		addModuleSourceMap(bundleSourceMap, loader);

		var loaderMappings = {};
		var loaderModules = usedModules.map(function(module) {
			addModuleSourceMap(bundleSourceMap, module);

			for (var requirePath in module.dependencies) {
				var requireModule = module.dependencies[requirePath];

				loaderMappings[requirePath] = loaderMappings[requirePath] || {};
				loaderMappings[requirePath][module.index] = requireModule.index;
			}

			return module.asset.content.minified;
		});

		loaderModules = loaderModules.join(',\n');
		loaderMappings = '{' + Object.keys(loaderMappings).sort().map(function(requirePath) {
			var mapping = loaderMappings[requirePath];
			return (JSON.stringify(requirePath) + ':{' +
				Object.keys(mapping).sort().map(function(from) {
					return from + ':' + mapping[from];
				}).join(',') + '}'
			);
		}).join(',') + '}';

		var bundle = loader.asset.content.minified.replace(/\[\],\{\},0/, function() {
			return '[\n' + loaderModules + '\n],' + loaderMappings + ',0';
		}) + '\n//@ sourceMappingURL=' + path.relative(path.dirname(outputPath), outputMapPath);

		var endTime = new Date();
		var bundleTime = endTime - startTime;

		bundleHasBeenBuilt = true;

		bundleCallback(null, {
			event: 'update',
			path: outputPath,
			content: {
				type: 'application/javascript',
				data: bundle
			},
			transforms: [
				{
					name: 'bundleJavaScript',
					importedModules: Object.keys(modules).length,
					usedModules: Object.keys(usedModules).length,
					time: bundleTime
				}
			]
		});

		bundleCallback(null, {
			event: 'update',
			path: outputMapPath,
			content: {
				type: 'application/json',
				data: bundleSourceMap.toString()
			},
			transforms: [
				{
					name: 'bundleJavaScript',
					importedModules: Object.keys(modules).length,
					usedModules: Object.keys(usedModules).length,
					time: bundleTime
				}
			]
		});
	}

	return function(asset, callback) {
		callback(null, asset);

		var shouldBundle = false;

		if (asset.event === 'delete') {
			if (modules[asset.path]) {
				shouldBundle = true;
			}
			delete modules[asset.path];
		} else if (asset.event === 'update' && isType.javaScript(asset)) {
			if (!asset.content.minified) {
				callback(new Error('Can only bundle minified JavaScript modules.'));
				return;
			}

			modules[asset.path] = loadJavaScriptAsset(asset);
			shouldBundle = true;
		}

		if (shouldBundle) {
			if (!loader) {
				loader = loadJavaScriptAsset(createLoader(loaderPath));
				callback(null, loader.asset);
			}

			bundleCallback = callback;
			clearTimeout(bundleTimer);
			bundleTimer = setTimeout(createBundle, 100);
		}
	};
});
