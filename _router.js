"use strict";
/*
 * File: _router.js
 * Desc: Processes and routes incoming URIs based on predefined routes, handling URL parameters and errors. If a matching file is found, it serves the file with appropriate headers; otherwise, it prepares the environment for client-side routing.
 * Deps: /_var.js, "{$TO_HOME}/_functions.js"; bySPA.ROUTES OR "{$TO_HOME}/_routes.js" MUST be previously defined/called.
 * Copyright (c) 2025 Andrés Trujillo [Mateus] byUwUr
 */

/**
 * Processes and routes incoming URIs based on predefined routes, handling URL parameters and errors.
 * This IIFE (Immediately Invoked Function Expression) ensures bySPA object exists globally
 * (typically on `window` in a browser) to avoid pollution and conflicts in the global namespace.
 * @param {Object} global - The global object, usually `window` in a browser.
 */
(function (global) {
	global.bySPA = global.bySPA || {};
	const bySPA = global.bySPA;

	function parseJSON(json) {
		if (typeof json !== "string") return null;
		try {
			return JSON.parse(json);
		} catch {
			return null;
		}
	}

	function isObject(value) {
		return value && typeof value === "object" && !Array.isArray(value);
	}

	function safeDecode(value) {
		try {
			return decodeURIComponent(value);
		} catch {
			return value;
		}
	}

	function normalizeURI(uri) {
		uri = typeof uri === "string" ? uri : "/";
		if (!uri.startsWith("/")) uri = `/${uri.replace(/^\/+/, "")}`;
		while (uri.length > 1 && uri.endsWith("/")) uri = uri.substring(0, uri.length - 1);
		return uri;
	}

	function queryToObject(searchParams) {
		const params = {};
		searchParams.forEach(function (value, key) {
			params[key] = value;
		});
		return params;
	}

	function getRoutes() {
		if (isObject(global.routes)) return global.routes;
		if (isObject(bySPA.routes)) return bySPA.routes;
		if (isObject(bySPA.ROUTES)) return bySPA.ROUTES;
		const storedRoutes = parseJSON(localStorage.getItem("ROUTES"));
		return isObject(storedRoutes) ? storedRoutes : {};
	}

	function getHomePath() {
		return String(bySPA.HOME_PATH || localStorage.getItem("HOME_PATH") || global.location.origin).replace(/\/$/, "");
	}

	function homePathURL(path) {
		if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return path;
		path = String(path || "");
		return `${getHomePath()}${path.startsWith("/") ? path : `/${path}`}`;
	}

	function getInitialURI(locationURL) {
		const queryURI = locationURL.searchParams.get("uri");
		if (typeof queryURI === "string" && queryURI !== "") return queryURI;

		const homeURL = new URL(`${getHomePath()}/`, global.location.href);
		const homePath = homeURL.pathname.replace(/\/$/, "");
		if (homePath && locationURL.pathname.startsWith(homePath)) return locationURL.pathname.slice(homePath.length) || "/";
		return locationURL.pathname || "/";
	}

	function parseURI(uri, get) {
		uri = normalizeURI(uri);
		const url = uri;
		if (!uri.includes("/$/")) return { uri, url, get };

		const parts = uri.split("/$/");
		uri = parts.shift() || "/";
		const keyValuePairs = parts.join("/$/").split("/");
		for (let i = 0; i < keyValuePairs.length; i += 2) if (keyValuePairs[i + 1] !== undefined) get[safeDecode(keyValuePairs[i])] = safeDecode(keyValuePairs[i + 1]);

		return { uri: normalizeURI(uri), url, get };
	}

	function routerError(status, message) {
		const error = { status, message };
		bySPA.ROUTER_ERROR = error;
		localStorage.setItem("ROUTER_ERROR", JSON.stringify(error));
		console.error(`Error ${status}: ${message}`);
		if (typeof bySPA.errorPage === "function") bySPA.errorPage(status, message);
		return null;
	}

	bySPA.initRouter = function () {
		const locationURL = new URL(global.location.href);
		const host = global.location.host || "";
		const notEnvAppEnv = /^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/.test(host) ? "DEV" : "PROD";
		const appEnv = global.APP_ENV || bySPA.APP_ENV || localStorage.getItem("APP_ENV") || notEnvAppEnv;
		const appVersion = global.APP_VERSION || bySPA.APP_VERSION || localStorage.getItem("APP_VERSION") || "0.1by";
		const routes = getRoutes();
		const post = parseJSON(localStorage.getItem("_POST")) || {};
		let get = queryToObject(locationURL.searchParams);
		let { uri, url } = parseURI(getInitialURI(locationURL), get);
		const route = routes[uri];

		if (!route || (!Object.prototype.hasOwnProperty.call(route, "URI") && !Object.prototype.hasOwnProperty.call(route, "FILE"))) return routerError(404, `Route "${uri}" does not exist.`);

		get = { ...get, ...(isObject(route.GET) ? route.GET : {}) };
		const routePost = { ...post, ...(isObject(route.POST) ? route.POST : {}) };

		bySPA.APP_ENV = appEnv;
		bySPA.APP_VERSION = appVersion;
		bySPA.URI = uri;
		bySPA.URL = url;
		bySPA.ROUTES = routes;
		bySPA._GET = get;
		bySPA._POST = routePost;

		localStorage.removeItem("ROUTER_ERROR");
		localStorage.setItem("APP_ENV", appEnv);
		localStorage.setItem("APP_VERSION", appVersion);
		localStorage.setItem("URI", uri);
		localStorage.setItem("URL", url);
		localStorage.setItem("ROUTES", JSON.stringify(routes));
		localStorage.setItem("_GET", JSON.stringify(get));
		localStorage.setItem("_POST", JSON.stringify(routePost));

		if (appEnv === "DEV") {
			console.log("=== JS Router ===");
			console.log("APP_ENV", appEnv);
			console.log("APP_VERSION", appVersion);
			console.log("URI", uri);
			console.log("URL", url);
			console.log("ROUTES", JSON.stringify(routes));
			console.log("_GET", JSON.stringify(get));
			console.log("_POST", JSON.stringify(routePost));
			console.log("=== JS Router ===");
		}

		if (route.FILE) {
			global.location.replace(homePathURL(route.FILE));
			return { uri, url, file: route.FILE, get, post: routePost };
		}

		return { uri, url, route, get, post: routePost };
	};

	bySPA.initRouter();
})(typeof window !== "undefined" ? window : this);
