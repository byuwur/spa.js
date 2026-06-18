"use strict";
/*
 * File: _routes.js
 * Desc: Defines the routing map for the application, including URIs, GET/POST parameters, and associated components.
 * Deps: none
 * Copyright (c) 2025 Andrés Trujillo [Mateus] byUwUr
 */

(function (global) {
	global.bySPA = global.bySPA || {};
	const bySPA = global.bySPA;

	// URIs
	const ROUTE_ROOT = "/";

	const ROUTE_HOME_ES = "inicio";
	const ROUTE_PAGE_ES = "pagina";
	const ROUTE_HOME_EN = "home";
	const ROUTE_PAGE_EN = "page";
	const ROUTE_VIDEO = "video";
	const ROUTE_WEBSOCKET = "socket";
	const ROUTE_PDF = "pdf";

	let ROUTE_HOME = "inicio";
	let ROUTE_PAGE = "pagina";

	switch (bySPA.APP_LANG) {
		case "es":
		default:
			ROUTE_HOME = "inicio";
			ROUTE_PAGE = "pagina";
			break;
		case "en":
			ROUTE_HOME = "home";
			ROUTE_PAGE = "page";
			break;
	}

	const ROUTE_ES = "es";
	const ROUTE_EN = "en";
	const ROUTE_ERROR = "error";
	const ROUTE_LOGIN = "login";
	const ROUTE_LOGOUT = "logout";
	const ROUTE_DEMO = "demo";
	const ROUTE_COOKIES = "cookies";

	// Default components to include on each route
	const COMPONENTS_EMPTY = { COMPONENT: { "nav#spa-nav": "", "footer#spa-foot": "" } };
	const ROOT_COMPONENTS = { COMPONENT: { "nav#spa-nav": "/sidebar.html", "footer#spa-foot": "" } };

	// Route definitions
	bySPA.ROUTES = {
		// "/"
		[`${ROUTE_ROOT}`]: { URI: `/main.example.html`, ...ROOT_COMPONENTS },
		[`/${ROUTE_ES}`]: { URI: ``, GET: { lang: "es" }, ...ROOT_COMPONENTS },
		[`/${ROUTE_EN}`]: { URI: ``, GET: { lang: "en" }, ...ROOT_COMPONENTS },
		[`/${ROUTE_HOME_ES}`]: { URI: `/main.example.html`, GET: { lang: "es" }, ...ROOT_COMPONENTS },
		[`/${ROUTE_HOME_EN}`]: { URI: `/main.example.html`, GET: { lang: "en" }, ...ROOT_COMPONENTS },
		[`/${ROUTE_PAGE_ES}`]: { URI: `/page.example.html`, GET: { lang: "es" }, ...ROOT_COMPONENTS },
		[`/${ROUTE_PAGE_EN}`]: { URI: `/page.example.html`, GET: { lang: "en" }, ...ROOT_COMPONENTS },
		[`/${ROUTE_VIDEO}`]: { URI: `/video.example.html`, ...ROOT_COMPONENTS },
		[`/${ROUTE_PDF}`]: { FILE: `/img/pdf/sample.pdf` }
	};

	localStorage.setItem("ROUTES", JSON.stringify(bySPA.ROUTES));
})(typeof window !== "undefined" ? window : this);
