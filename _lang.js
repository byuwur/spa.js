"use strict";
/*
 * File: _lang.js
 * Desc: Contains the logic in charge of multi-language support.
 * Deps: jQuery, /_functions.js
 * Copyright (c) 2025 Andrés Trujillo [Mateus] byUwUr
 */

/**
 * Initializes global object and assigns its properties.
 * This IIFE (Immediately Invoked Function Expression) ensures byCommon object exists globally
 * (typically on `window` in a browser) to avoid pollution and conflicts in the global namespace.
 * @param {Object} global - The global object, usually `window` in a browser.
 */
(function (global) {
	global.byCommon = global.byCommon || {};
	const byCommon = global.byCommon;
	// Common selectors
	byCommon.LANG_PATH = "/lang";
	byCommon.LANG_CACHE = {};
	byCommon.LANG_STRINGS = {};

	function eachMatching(root, selector, callback) {
		root = root && root.nodeType ? root : document;
		if (root.matches?.(selector)) callback(root);
		root.querySelectorAll?.(selector).forEach(callback);
	}

	function normalizeLanguage(lang) {
		const bySPA = global.bySPA || {};
		if (typeof bySPA.normalizeLanguage === "function") return bySPA.normalizeLanguage(lang);
		lang = String(lang || "")
			.trim()
			.slice(0, 2)
			.toLowerCase();
		return ["es", "en"].includes(lang) ? lang : "";
	}

	function getCookie(name) {
		return `; ${document.cookie}`.split(`; ${name}=`).pop().split(";").shift() || "";
	}

	byCommon.setLanguage = function (lang) {
		const bySPA = global.bySPA || {};
		if (typeof bySPA.setLanguage === "function") return bySPA.setLanguage(lang);
		const normalized = normalizeLanguage(lang) || "es";
		localStorage.setItem("APP_LANG", normalized);
		document.cookie = `lang=${encodeURIComponent(normalized)};max-age=31536000;path=/`;
		document.documentElement.setAttribute("lang", normalized);
		document.documentElement.setAttribute("dir", "ltr");
		return normalized;
	};

	byCommon.getLanguage = function (routing = {}) {
		const bySPA = global.bySPA || {};
		return (
			normalizeLanguage(routing?.get?.lang) ||
			normalizeLanguage(bySPA._GET?.lang) ||
			normalizeLanguage(bySPA.APP_LANG) ||
			normalizeLanguage(localStorage.getItem("APP_LANG")) ||
			normalizeLanguage(getCookie("lang")) ||
			normalizeLanguage(global.navigator?.language) ||
			"es"
		);
	};

	byCommon.getLangString = function (key, fallback = "") {
		if (!key) return fallback;
		if (Object.prototype.hasOwnProperty.call(byCommon.LANG_STRINGS, key)) return byCommon.LANG_STRINGS[key];
		const value = String(key)
			.split(".")
			.reduce((item, part) => (item && typeof item === "object" ? item[part] : undefined), byCommon.LANG_STRINGS);
		return value ?? fallback;
	};

	byCommon.loadLanguage = function (lang) {
		lang = byCommon.setLanguage(lang);
		if (byCommon.LANG_CACHE[lang]) return Promise.resolve(byCommon.LANG_CACHE[lang]);
		const bySPA = global.bySPA || {};
		const path = `${byCommon.LANG_PATH}/${lang}.json`;
		const url = typeof bySPA.buildRequestURL === "function" ? bySPA.buildRequestURL(path) : `${String(bySPA.HOME_PATH || "").replace(/\/$/, "")}${path}`;
		return Promise.resolve(
			$.ajax({
				url,
				type: "GET",
				dataType: "json",
				cache: true,
			}),
		).then(function (strings) {
			byCommon.LANG_CACHE[lang] = strings || {};
			return byCommon.LANG_CACHE[lang];
		});
	};

	byCommon.applyLanguage = function (root = document, strings = byCommon.LANG_STRINGS) {
		byCommon.LANG_STRINGS = strings || {};
		eachMatching(root, "[data-i18n]", function (element) {
			const key = element.getAttribute("data-i18n");
			element.textContent = byCommon.getLangString(key, element.textContent);
		});
		eachMatching(root, "[data-i18n-html]", function (element) {
			const key = element.getAttribute("data-i18n-html");
			element.innerHTML = byCommon.getLangString(key, element.innerHTML);
		});
		eachMatching(root, "[data-i18n-title]", function (element) {
			const key = element.getAttribute("data-i18n-title");
			const value = byCommon.getLangString(key, element.getAttribute("title") || "");
			element.setAttribute("title", value);
			if (element.hasAttribute("data-bs-toggle")) element.setAttribute("data-bs-title", value);
			if (typeof bootstrap !== "undefined" && bootstrap.Tooltip) bootstrap.Tooltip.getInstance(element)?.dispose();
		});
		eachMatching(root, "[data-i18n-route]", function (element) {
			const key = element.getAttribute("data-i18n-route");
			const route = byCommon.getLangString(key, "").replace(/^\/+/, "");
			if (route) element.setAttribute("href", `#/${route}`);
		});
		document.dispatchEvent(new CustomEvent("bycommon:language", { detail: { lang: localStorage.getItem("APP_LANG"), strings: byCommon.LANG_STRINGS } }));
	};

	byCommon.initLanguage = function (routing = {}) {
		const lang = byCommon.getLanguage(routing);
		return byCommon
			.loadLanguage(lang)
			.then(function (strings) {
				byCommon.applyLanguage(document, strings);
				return strings;
			})
			.catch(function (xhr, status, error) {
				console.warn(`initLanguage(): ${lang}`, xhr?.status || status || error || xhr);
				return null;
			});
	};
})(typeof window !== "undefined" ? window : this);
