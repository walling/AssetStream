
(function(global, modules, mappings, entry) {

	function loadModule(index) {
		var fn = modules[index];
		if (!fn) {
			return;
		}
		if (fn.module) {
			return fn.module.exports;
		}
		var module = fn.module = {
			exports: {}
		};
		fn.call(global, function(name) {
			return loadModule((mappings[name] || {})[index]);
		}, module.exports, module, global);
		return module.exports;
	}

	loadModule(entry);

}(this,[],{},0));
