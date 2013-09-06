
(function(global, modules, mappings, entry) {

	function loadModule(index) {
		var module = modules[index];
		if (!module) {
			return;
		}
		if ('exports' in module) {
			return module.exports;
		}
		var exports = module.exports = {};
		module.call(global, function(name) {
			return loadModule((mappings[name] || {})[index]);
		}, exports, module, global);
	}

	loadModule(entry);

}(this, [/* modules */], {/* mappings */}, /* entry */0));
