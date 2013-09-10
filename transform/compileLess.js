
var Transform = require('../Transform');
var isType = require('../helper/isType');
var less = require('less');
var path = require('path');
var common = require('common');

var db = {};

less.Parser.importer = function(filename, currentFileInfo, callback, env) {
	// console.log('1. Filename:', filename);
	// console.log('2. fileInfo:', currentFileInfo);
	// console.log('3. Callback:', callback);
	// console.log('4. Env:', env);
	// console.log();

	var currentPath = currentFileInfo.filename;
	var importPath = path.resolve(path.dirname(currentPath), filename);
	var importItem = db[importPath];

	// console.log('Import path:', importPath);
	// console.log();

	if (!importItem) {
		callback({
			type: 'File',
			message: filename + " wasn't found"
		}, { filename: currentPath });
		return;
	}

	importItem.updates[currentPath] = true;

	if (!importItem.ast) {
		importItem.ast = common.future();

		try {
			new less.Parser({
				filename: importItem.asset.path
			}).parse(importItem.asset.content.data, function(error, ast) {
				ast = ast || {};
				ast.filename = importItem.asset.path;
				importItem.ast.put(error, ast);
			});
		} catch (error) {
			importItem.ast.put({
				type: 'File',
				message: 'LESS parse error.'
			}, { filename: importItem.asset.path });
		}
	}

	importItem.ast.get(function(error, ast) {
		if (error) {
			importItem.ast = null;
		}
		callback(error, ast, path.basename(importPath));
	});
};

function updateAsset(asset, callback) {
	if (asset.content && Buffer.isBuffer(asset.content.data)) {
		asset.content.data = asset.content.data.toString();
	}

	if (asset.event === 'delete') {
		delete db[asset.path];
		callback(null, { filename: asset.path });
	} else {
		db[asset.path] = {
			asset: asset,
			updates: {},
			css: null
		};
	}

	var path;

	for (path in db) {
		db[path].ast = null;
	}

	for (path in db) {
		less.Parser.importer(path, { filename: '/' }, callback, {});
	}
}

function errorCSS(error, ast) {
	var filename = ast.filename;
	if (error.line) {
		filename += ':' + error.line;
		if (error.column) {
			filename += ':' + error.column;
		}
	}

	var message = '' + [error.message];
	if (!message) {
		message = JSON.stringify(error);
	}

	var css =
		'body:before {\n' +
		'\tposition: fixed;\n' +
		'\tz-index: 100000;\n' +
		'\tcontent: ' + JSON.stringify(filename + ': ' + message) + ';\n' +
		'\ttop: 0;\n' +
		'\tleft: 0;\n' +
		'\tright: 0;\n' +
		'\tpadding: 10px;\n' +
		'\tbackground-color: #900;\n' +
		'\tcolor: #fff;\n' +
		'\tborder-bottom: 2px solid #600;\n' +
		'}\n';
	return css;
}

module.exports = Transform.create(function() {
	var cachedCSS = {};

	return function(asset, callback) {
		callback(null, asset);

		if (isType.less(asset)) {
			updateAsset(asset, function(error, ast) {
				var css;
				if (error) {
					css = errorCSS(error, ast);
				} else if (ast.toCSS) {
					try {
						css = ast.toCSS();
					} catch (compileError) {
						css = errorCSS(compileError, ast);
					}
				} else {
					css = null;
				}

				if (cachedCSS[ast.filename] !== css) {
					var cssAssetPath = ast.filename.replace(/\.less$/, '') + '.css';

					if (typeof(css) === 'string') {
						cachedCSS[ast.filename] = css;
						callback(null, {
							event: 'update',
							path: cssAssetPath,
							content: {
								type: 'text/css',
								data: css
							}
						});
					} else {
						delete cachedCSS[ast.filename];
						callback(null, {
							event: 'delete',
							path: cssAssetPath
						});
					}
				}
			});
		}
	};
});


// var AssetStream = require('../AssetStream');

// AssetStream.source.directory(__dirname + '/../test').pipe(module.exports()).pipe(AssetStream.Destination.create(function() {
// 	return function(asset, next) {
// 		if (/\.less$/.test(asset.path)) {
// 			console.log(asset.path);
// 		} else if (/\.css$/.test(asset.path)) {
// 			console.log(asset.path + ':\n' + asset.content.data.replace(/^/mg, '  '));
// 		}
// 		next();
// 	};
// })());

// setInterval(function() {}, 1000);


// function test(asset, callback) {
// 	console.log();
// 	console.log('------');

// 	updateAsset(asset, function(error, ast) {
// 		if (error) {
// 			console.log(ast.filename + ' Error: ' + error.message);
// 		} else {
// 			console.log(ast.filename + ' AST:\n' + ast.toCSS().replace(/^/gm, '  '));
// 		}
// 		if (callback) {
// 			setTimeout(callback, 1000);
// 			callback = null;
// 		}
// 	});
// }

// common.step([

// 	function(next) {
// 		test({
// 			path: '/site/main.less',
// 			content: { data: '@import "../common/general/page";\na { color: @color; }\n' }
// 		}, next);
// 	},

// 	function(next) {
// 		test({
// 			path: '/common/config.less',
// 			content: { data: '@color: red;\n' }
// 		}, next);
// 	},

// 	function(next) {
// 		test({
// 			path: '/common/general/page.less',
// 			content: { data: '@import "../config.less";\nbody { background: @color; }\n' }
// 		}, next);
// 	},

// 	function() {
// 	}

// ]);
