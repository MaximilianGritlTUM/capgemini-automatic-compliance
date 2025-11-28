/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"capgeminiappws2025/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
