"use strict";
/*
 * File: _var.js
 * Desc: Initializes the system environment, sets up path-related variables, and optionally stores these values in the browser's localStorage. (MUST be included in every file)
 * Deps: none
 * Copyright (c) 2025 Andrés Trujillo [Mateus] byUwUr
 */

/**
 * Initializes the system environment.
 * This IIFE (Immediately Invoked Function Expression) ensures bySPA object exists globally
 * (typically on `window` in a browser) to avoid pollution and conflicts in the global namespace.
 * @param {Object} global - The global object, usually `window` in a browser.
 */
(function (global) {
	global.bySPA = global.bySPA || {};
	const bySPA = global.bySPA;

	/**
	 * Replaces "\\" directory separators to "/"
	 * @param {string} path String to convert
	 * @return string Converted path
	 */
	function stdDirSeparator(path) {
		return String(path || "").replace(/\\/g, "/");
	}

	function dirname(path) {
		return stdDirSeparator(path).replace(/\/[^/]*$/, "") || ".";
	}

	const host = global.location.host || "";
	const NOTENV_APP_ENV = /^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/.test(host) ? "DEV" : "PROD";

	const currentScript = document.currentScript;
	const scriptURL = new URL(currentScript?.getAttribute("src") || "_var.js", global.location.href);

	bySPA.APP_ENV = global.APP_ENV || localStorage.getItem("APP_ENV") || NOTENV_APP_ENV;
	bySPA.PROTOCOL = global.location.protocol === "https:" ? "https://" : "http://";
	bySPA.THIS__FILE__ = stdDirSeparator(scriptURL.href);
	bySPA.THIS_PATH = dirname(bySPA.THIS__FILE__);
	bySPA.HOME_PATH = bySPA.THIS_PATH;

	const currentDir = dirname(global.location.href);
	const homeURL = new URL(bySPA.HOME_PATH + "/");
	const currentURL = new URL(currentDir + "/");

	const homeParts = homeURL.pathname.split("/").filter(Boolean);
	const currentParts = currentURL.pathname.split("/").filter(Boolean);

	let common = 0;
	while (homeParts[common] && homeParts[common] === currentParts[common]) common++;

	const up = "../".repeat(Math.max(0, currentParts.length - common));
	const down = homeParts.slice(common).join("/");
	bySPA.TO_HOME = up + down || ".";

	bySPA.PATH_DIFF = Math.max(0, currentParts.length - homeParts.length);

	localStorage.setItem("APP_ENV", bySPA.APP_ENV);
	localStorage.setItem("PROTOCOL", bySPA.PROTOCOL);
	localStorage.setItem("PATH_DIFF", String(bySPA.PATH_DIFF));
	localStorage.setItem("TO_HOME", bySPA.TO_HOME);
	localStorage.setItem("THIS_PATH", bySPA.THIS_PATH);
	localStorage.setItem("HOME_PATH", bySPA.HOME_PATH);

	if (bySPA.APP_ENV === "DEV") {
		console.log("PROTOCOL", bySPA.PROTOCOL);
		console.log("PATH_DIFF", bySPA.PATH_DIFF);
		console.log("TO_HOME", bySPA.TO_HOME);
		console.log("THIS_PATH", bySPA.THIS_PATH);
		console.log("HOME_PATH", bySPA.HOME_PATH);
	}
})(typeof window !== "undefined" ? window : this);
