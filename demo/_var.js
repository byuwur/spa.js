"use strict";
/*
 * File: demo/_var.js
 * Desc: Initializes the demo application's environment and path variables.
 * Deps: none
 * Copyright (c) 2026 Andrés Trujillo [Mateus] byUwUr
 */

(function (global) {
  global.bySPA = global.bySPA || {};
  const bySPA = global.bySPA;

  const std_dir_separator = (path) => {
    return String(path || "").replace(/\\/g, "/");
  };

  const dirname = (path) => {
    return std_dir_separator(path).replace(/\/[^/]*$/, "") || ".";
  };

  const host = global.location.host || "";
  const NOTENV_APP_ENV = /^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/.test(host) ? "DEV" : "PROD";
  const currentScript = document.currentScript;
  const scriptURL = new URL(currentScript?.getAttribute("src") || "_var.js", global.location.href);
  const ROUTER_MODE = (localStorage.getItem("ROUTER_MODE") || "hash").toLowerCase();

  bySPA.APP_ENV = localStorage.getItem("APP_ENV") || NOTENV_APP_ENV;
  bySPA.ROUTER_MODE = ROUTER_MODE === "path" ? "path" : "hash";
  bySPA.PROTOCOL = global.location.protocol === "https:" ? "https://" : "http://";
  bySPA.THIS__FILE__ = std_dir_separator(scriptURL.href);
  bySPA.THIS_PATH = dirname(bySPA.THIS__FILE__);
  bySPA.HOME_PATH = bySPA.THIS_PATH;
  bySPA.ERROR_PATH = new URL("../_error.html", scriptURL).href;

  const currentDir = dirname(global.location.href);
  const homeURL = new URL(bySPA.HOME_PATH + "/");
  const currentURL = new URL(currentDir + "/");
  const homeParts = homeURL.pathname.split("/").filter(Boolean);
  const currentParts = currentURL.pathname.split("/").filter(Boolean);

  let common = 0;
  while (homeParts[common] && homeParts[common] === currentParts[common]) common++;
  bySPA.PATH_DIFF = Math.max(0, currentParts.length - homeParts.length);

  const up = "../".repeat(Math.max(0, currentParts.length - common));
  const down = homeParts.slice(common).join("/");
  bySPA.TO_HOME = up + down || ".";

  localStorage.setItem("APP_ENV", bySPA.APP_ENV);
  localStorage.setItem("ROUTER_MODE", bySPA.ROUTER_MODE);
  localStorage.setItem("PROTOCOL", bySPA.PROTOCOL);
  localStorage.setItem("PATH_DIFF", String(bySPA.PATH_DIFF));
  localStorage.setItem("TO_HOME", bySPA.TO_HOME);
  localStorage.setItem("THIS_PATH", bySPA.THIS_PATH);
  localStorage.setItem("HOME_PATH", bySPA.HOME_PATH);

  if (bySPA.APP_ENV === "DEV") {
    console.log("APP_ENV", bySPA.APP_ENV);
    console.log("ROUTER_MODE", bySPA.ROUTER_MODE);
    console.log("PROTOCOL", bySPA.PROTOCOL);
    console.log("PATH_DIFF", bySPA.PATH_DIFF);
    console.log("TO_HOME", bySPA.TO_HOME);
    console.log("THIS_PATH", bySPA.THIS_PATH);
    console.log("HOME_PATH", bySPA.HOME_PATH);
  }
})(typeof window !== "undefined" ? window : this);
