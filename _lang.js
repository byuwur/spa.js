"use strict";
/*
 * File: _lang.js
 * Desc: Contains the logic in charge of multi-language support.
 * Deps: jQuery, /_functions.js
 * Copyright (c) 2025 Andrés Trujillo [Mateus] byUwUr
 */

/**
 * Initializes global object and assigns its properties.
 * This IIFE (Immediately Invoked Function Expression) ensures byCommon and bySPA objects exist globally
 * (typically on `window` in a browser) to avoid pollution and conflicts in the global namespace.
 * @param {Object} global - The global object, usually `window` in a browser.
 */
(function (global) {
	global.byCommon = global.byCommon || {};
	global.bySPA = global.bySPA || {};
	const byCommon = global.byCommon;
	const bySPA = global.bySPA;

	const DEFAULT_APP_LANG = "es";
	const APP_LANGS = ["es", "en", "ja"];

	// Common selectors
	byCommon.LANG_PATH = byCommon.LANG_PATH || "/lang";
	byCommon.LANG_CACHE = byCommon.LANG_CACHE || {};
	byCommon.LANG_STRINGS = byCommon.LANG_STRINGS || {};
	bySPA.APP_LANGS = Array.isArray(bySPA.APP_LANGS) && bySPA.APP_LANGS.length ? bySPA.APP_LANGS : APP_LANGS;
	bySPA.DEFAULT_APP_LANG = bySPA.DEFAULT_APP_LANG || DEFAULT_APP_LANG;

	function eachMatching(root, selector, callback) {
		root = root && root.nodeType ? root : document;
		if (root.matches?.(selector)) callback(root);
		root.querySelectorAll?.(selector).forEach(callback);
	}

	function refreshBootstrapWidgets() {
		if (typeof byCommon.initBootstrap === "function") byCommon.initBootstrap();
	}

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

	byCommon.setLanguage = bySPA.setLanguage;

	byCommon.getLanguage = function (routing = {}) {
		return (
			bySPA.normalizeLanguage(routing?.get?.lang) ||
			bySPA.normalizeLanguage(bySPA._GET?.lang) ||
			bySPA.normalizeLanguage(bySPA.APP_LANG) ||
			bySPA.normalizeLanguage(localStorage.getItem("APP_LANG")) ||
			bySPA.normalizeLanguage(get_cookie("lang")) ||
			bySPA.normalizeLanguage(global.navigator?.language) ||
			bySPA.DEFAULT_APP_LANG
		);
	};

	bySPA.prepareRouteGet = function (get = {}) {
		if (get.lang) get.lang = bySPA.setLanguage(get.lang);
		return get;
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
		eachMatching(root, "[data-i18n-label]", function (element) {
			const key = element.getAttribute("data-i18n-label");
			const value = byCommon.getLangString(key, element.getAttribute("aria-label") || element.getAttribute("title") || "");
			element.setAttribute("aria-label", value);
		});
		eachMatching(root, "[data-i18n-alt]", function (element) {
			const key = element.getAttribute("data-i18n-alt");
			const value = byCommon.getLangString(key, element.getAttribute("alt") || "");
			element.setAttribute("alt", value);
		});
		eachMatching(root, "[data-i18n-route]", function (element) {
			const key = element.getAttribute("data-i18n-route");
			const route = byCommon.getLangString(key, "").replace(/^\/+/, "");
			if (route) element.setAttribute("href", `#/${route}`);
		});
		refreshBootstrapWidgets();
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

	bySPA.setLanguage(get_url_param("lang") || get_cookie("lang") || localStorage.getItem("APP_LANG") || global.navigator?.language);
	document.addEventListener("byspa:load", function (event) {
		byCommon.initLanguage(event.detail);
	});
})(typeof window !== "undefined" ? window : this);
