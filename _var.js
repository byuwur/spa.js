"use strict";
/*
 * File: _var.js
 * Desc: Initializes the system environment, sets up path-related variables, and optionally stores these values in the browser's localStorage. (MUST be included in every file)
 * Deps: _functions.js
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
	const std_dir_separator = (path) => {
		return String(path || "").replace(/\\/g, "/");
	};

	/**
	 * Returns the directory portion of a path using normalized "/" separators.
	 * @param {string} path Path string to inspect.
	 * @return {string} Directory path, or "." when no directory portion exists.
	 */
	const dirname = (path) => {
		return std_dir_separator(path).replace(/\/[^/]*$/, "") || ".";
	};

	/**
	 * Retrieves the value of a URL param.
	 * @param {string} name The name of the param to retrieve.
	 * @return {string|null} The value of the param or null if not found.
	 */
	const get_url_param = (name) => {
		const href = (typeof window !== "undefined" && window.location?.href) || (typeof location !== "undefined" && location.href) || "";
		if (!href) return null;
		const locationURL = new URL(href);
		const directValue = locationURL.searchParams.get(name);
		if (directValue !== null) return directValue;
		const hash = locationURL.hash || "";
		if (!hash.startsWith("#/") || !hash.includes("?")) return null;
		return new URLSearchParams(hash.split("?", 2)[1]).get(name);
	};

	const host = global.location.host || "";
	const NOTENV_APP_ENV = /^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/.test(host) ? "DEV" : "PROD";
	const ROUTER_MODE = (localStorage.getItem("ROUTER_MODE") || "hash").toLowerCase();
	const DEFAULT_APP_LANG = "es";
	const APP_LANGS = ["es", "en"];

	const currentScript = document.currentScript;
	const scriptURL = new URL(currentScript?.getAttribute("src") || "_var.js", global.location.href);

	bySPA.APP_LANGS = Array.isArray(global.APP_LANGS) && global.APP_LANGS.length ? global.APP_LANGS : APP_LANGS;
	bySPA.DEFAULT_APP_LANG = global.DEFAULT_APP_LANG || DEFAULT_APP_LANG;
	bySPA.normalizeLanguage = function (lang) {
		lang = String(lang || "")
			.trim()
			.slice(0, 2)
			.toLowerCase();
		return bySPA.APP_LANGS.includes(lang) ? lang : "";
	};
	bySPA.setLanguage = function (lang) {
		const normalized = bySPA.normalizeLanguage(lang) || bySPA.normalizeLanguage(bySPA.APP_LANG) || bySPA.DEFAULT_APP_LANG;
		bySPA.APP_LANG = normalized;
		localStorage.setItem("APP_LANG", normalized);
		set_cookie("lang", normalized);
		document.documentElement.setAttribute("lang", normalized);
		document.documentElement.setAttribute("dir", "ltr");
		return normalized;
	};

	bySPA.APP_ENV = localStorage.getItem("APP_ENV") || NOTENV_APP_ENV;
	bySPA.ROUTER_MODE = ROUTER_MODE === "path" ? "path" : "hash";
	bySPA.setLanguage(get_url_param("lang") || get_cookie("lang") || localStorage.getItem("APP_LANG") || global.navigator?.language);
	bySPA.PROTOCOL = global.location.protocol === "https:" ? "https://" : "http://";
	bySPA.THIS__FILE__ = std_dir_separator(scriptURL.href);
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
	localStorage.setItem("APP_LANG", bySPA.APP_LANG);
	localStorage.setItem("ROUTER_MODE", bySPA.ROUTER_MODE);
	localStorage.setItem("PROTOCOL", bySPA.PROTOCOL);
	localStorage.setItem("PATH_DIFF", String(bySPA.PATH_DIFF));
	localStorage.setItem("TO_HOME", bySPA.TO_HOME);
	localStorage.setItem("THIS_PATH", bySPA.THIS_PATH);
	localStorage.setItem("HOME_PATH", bySPA.HOME_PATH);

	if (bySPA.APP_ENV === "DEV") {
		console.log("APP_ENV", bySPA.APP_ENV);
		console.log("APP_LANG", bySPA.APP_LANG);
		console.log("ROUTER_MODE", bySPA.ROUTER_MODE);
		console.log("PROTOCOL", bySPA.PROTOCOL);
		console.log("PATH_DIFF", bySPA.PATH_DIFF);
		console.log("TO_HOME", bySPA.TO_HOME);
		console.log("THIS_PATH", bySPA.THIS_PATH);
		console.log("HOME_PATH", bySPA.HOME_PATH);
	}
})(typeof window !== "undefined" ? window : this);
