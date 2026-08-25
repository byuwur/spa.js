"use strict";
/*
 * File: _router.js
 * Desc: Processes and routes incoming URIs based on predefined routes, handling URL parameters and errors. If a matching file is found, it serves the file with appropriate headers; otherwise, it prepares the environment for client-side routing.
 * Deps: /_var.js, "{$TO_HOME}/_functions.js"; bySPA.ROUTES OR "{$TO_HOME}/_routes.js" MUST be previously defined/called.
 * Copyright (c) 2026 Andrés Trujillo [Mateus] byUwUr
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

  /*
   * === /spa.js/ only: browser helpers replacing PHP globals/rewrite rules ===
   * _router.php starts with $_GET["uri"] after Apache/nginx rewrites the URL.
   * Static /spa.js/ has to infer that same URI from ?uri=, #/hash routes,
   * normal path routing, or file:// fallback paths.
   */
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

  function hashToURI(hash) {
    hash = String(hash || "");
    if (!hash.startsWith("#/")) return null;
    return hash.slice(1) || "/";
  }

  function mergeQueryString(queryString, get) {
    new URLSearchParams(queryString || "").forEach(function (value, key) {
      get[key] = value;
    });
    return get;
  }

  function routeQueryToObject(route) {
    if (typeof route?.URI !== "string" || !route.URI.includes("?")) return {};
    return queryToObject(new URLSearchParams(route.URI.split("?", 2)[1]));
  }

  function getRoutes() {
    if (is_object(bySPA.ROUTES)) return bySPA.ROUTES;
    const storedRoutes = parse_json(byStorage.getItem("ROUTES"));
    return is_object(storedRoutes) ? storedRoutes : {};
  }

  /**
   * Validates the small public route contract before routing starts.
   * @param {Object<string, Object>} routes Route table to validate.
   * @return {Object<string, Object>} The same validated route table.
   * @throws {TypeError} When a route or supported field has the wrong shape.
   */
  function validateRoutes(routes) {
    Object.entries(routes).forEach(function ([path, route]) {
      if (!is_object(route)) throw new TypeError(`Route "${path}" must be an object.`);
      if (!("URI" in route) && !("FILE" in route)) throw new TypeError(`Route "${path}" must define URI or FILE.`);
      ["URI", "FILE"].forEach(function (field) {
        if (field in route && typeof route[field] !== "string") throw new TypeError(`Route "${path}" field ${field} must be a string.`);
      });
      ["GET", "POST", "DATA", "COMPONENT"].forEach(function (field) {
        if (field in route && !is_object(route[field])) throw new TypeError(`Route "${path}" field ${field} must be an object.`);
      });
    });
    return routes;
  }

  function getHomePath() {
    return String(bySPA.HOME_PATH || byStorage.getItem("HOME_PATH") || global.location.origin).replace(/\/$/, "");
  }

  function homePathURL(path) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return path;
    path = String(path || "");
    return `${getHomePath()}${path.startsWith("/") ? path : `/${path}`}`;
  }

  function getInitialURI(locationURL) {
    const queryURI = locationURL.searchParams.get("uri");
    if (typeof queryURI === "string" && queryURI !== "") return queryURI;

    const hashURI = hashToURI(locationURL.hash);
    if (hashURI) return hashURI;

    const homeURL = new URL(`${getHomePath()}/`, global.location.href);
    const homePath = homeURL.pathname.replace(/\/$/, "");
    if (homePath && locationURL.pathname.startsWith(homePath)) {
      const relativePath = locationURL.pathname.slice(homePath.length) || "/";
      if (global.location.protocol === "file:" && /^\/index\.html?$/i.test(relativePath)) return "/";
      return relativePath;
    }
    if (global.location.protocol === "file:") return "/";
    return locationURL.pathname || "/";
  }

  function parseURI(uri, get) {
    uri = typeof uri === "string" ? uri : "/";
    const queryIndex = uri.indexOf("?");
    const queryString = queryIndex >= 0 ? uri.slice(queryIndex + 1) : "";
    uri = queryIndex >= 0 ? uri.slice(0, queryIndex) : uri;
    uri = normalizeURI(uri);
    mergeQueryString(queryString, get);
    const url = `${uri}${queryString ? `?${queryString}` : ""}`;
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
    byStorage.setItem("ROUTER_ERROR", JSON.stringify(error));
    console.error(`Error ${status}: ${message}`);
    if (typeof bySPA.errorPage === "function") bySPA.errorPage(status, message);
    return null;
  }
  /* === end /spa.js/ only === */

  bySPA.initRouter = function () {
    // The PHP rewrite rule is replaced here by reading the current browser URL.
    const locationURL = new URL(global.location.href);
    const host = global.location.host || "";
    const notEnvAppEnv = /^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/.test(host) ? "DEV" : "PROD";
    const appEnv = bySPA.APP_ENV || byStorage.getItem("APP_ENV") || notEnvAppEnv;
    const appVersion = bySPA.APP_VERSION || byStorage.getItem("APP_VERSION") || "0.1by";
    const routerMode = bySPA.ROUTER_MODE || byStorage.getItem("ROUTER_MODE") || "hash";
    const routes = validateRoutes(getRoutes());
    const storedGet = parse_json(byStorage.getItem("_GET")) || {};
    const post = parse_json(byStorage.getItem("_POST")) || {};

    // Initialize the URI from the GET parameter, hash route, path route, or fallback "/".
    let get = queryToObject(locationURL.searchParams);
    // Ensure the URI starts with a "/" and doesn't end with one, then handle /$/ parameters.
    let { uri, url } = parseURI(getInitialURI(locationURL), get);
    const route = routes[uri];

    // Check if the URI exists in the routes object; if not, return a 404 error.
    if (!route || (!Object.prototype.hasOwnProperty.call(route, "URI") && !Object.prototype.hasOwnProperty.call(route, "FILE"))) return routerError(404, `Route "${uri}" does not exist.`);

    // Merge additional GET and POST parameters from the routes object.
    // Initial routing uses the same authority as client navigation:
    // route-defined values > /$/ parameters > ordinary query values.
    get = { ...get, ...routeQueryToObject(route), ...(is_object(route.GET) ? route.GET : {}) };
    if (route.URI === "") {
      // === /spa.js/ only: preserve the current page for component-only routes ===
      const currentURI = storedGet.uri || byStorage.getItem("URI") || "/";
      get.uri = routes[currentURI]?.URI ? currentURI : "/";
    }
    // === /spa.js/ only: language support can adjust GET before localStorage is written ===
    if (typeof bySPA.prepareRouteGet === "function") bySPA.prepareRouteGet(get, { uri, url, route });
    const routePost = { ...post, ...(is_object(route.POST) ? route.POST : {}) };

    byStorage.removeItem("ROUTER_ERROR");

    bySPA.APP_ENV = appEnv;
    bySPA.APP_VERSION = appVersion;
    bySPA.ROUTER_MODE = routerMode;
    bySPA.URI = uri;
    bySPA.URL = url;
    bySPA.ROUTES = routes;
    bySPA._GET = get;
    bySPA._POST = routePost;

    // Store environment and routing information in localStorage for client-side use.
    byStorage.setItem("APP_ENV", appEnv);
    byStorage.setItem("APP_VERSION", appVersion);
    byStorage.setItem("ROUTER_MODE", routerMode);
    byStorage.setItem("URI", uri);
    byStorage.setItem("URL", url);
    byStorage.setItem("ROUTES", JSON.stringify(routes));
    byStorage.setItem("_GET", JSON.stringify(get));
    byStorage.setItem("_POST", JSON.stringify(routePost));

    if (appEnv === "DEV") {
      console.log("=== JS ROUTER ===");
      console.log("APP_VERSION", appVersion);
      console.log("URI", uri);
      console.log("URL", url);
      console.log("_GET", JSON.stringify(get));
      console.log("_POST", JSON.stringify(routePost));
      console.log("=== JS ROUTER ===");
    }

    if (route.FILE) {
      // === /spa.js/ only: static JS cannot send headers/readfile, so redirect to the asset ===
      global.location.replace(homePathURL(route.FILE));
      return { uri, url, file: route.FILE, get, post: routePost };
    }

    return { uri, url, route, get, post: routePost };
  };
})(typeof window !== "undefined" ? window : this);

bySPA.initRouter();
