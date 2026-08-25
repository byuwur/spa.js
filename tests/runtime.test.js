const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("hash routing guard remains active outside path mode", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "_spa.js"), "utf8");
  assert.match(source, /if \(bySPA\.ROUTER_MODE === "path"\) return;/);
});

test("route data precedence is query then path then route", () => {
  const query = { lang: "en", page: "1" };
  const params = { lang: "fr" };
  const route = { lang: "es" };
  assert.deepEqual({ ...query, ...params, ...route }, { lang: "es", page: "1" });
});

test("runtime exposes and logs one framework version without replacing APP_VERSION", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "_spa.js"), "utf8");
  const versions = [...source.matchAll(/bySPA\.VERSION\s*=\s*"([^"]+)";/g)];
  assert.equal(versions.length, 1);
  assert.ok(versions[0][1]);
  assert.match(source, /bySPA\.APP_VERSION = byStorage\.getItem\("APP_VERSION"\) \?\? "0\.1by";/);
  assert.ok(source.indexOf("bySPA.VERSION =") < source.indexOf('console.log("SPA_VERSION=", bySPA.VERSION);'));
});

test("application init keeps nested paths and early state application-relative", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "_init.js"), "utf8");
  const values = new Map();
  const location = {
    href: "https://example.test/project/app-a/nested/page.html",
    host: "example.test",
    protocol: "https:",
  };
  const document = {
    baseURI: location.href,
    currentScript: { getAttribute: () => "../_init.js" },
  };
  const window = {
    location,
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  };

  vm.runInNewContext(source, { URL, console: { log() {} }, document, window });

  assert.equal(window.bySPA.THIS_PATH, "https://example.test/project/app-a");
  assert.equal(window.bySPA.HOME_PATH, "https://example.test/project/app-a");
  assert.equal(window.bySPA.PATH_DIFF, 1);
  assert.equal(window.bySPA.TO_HOME, "../");
  assert.equal(window.byStorage.prefix, "bySPA:/project/app-a/nested:");
  assert.equal(values.get("bySPA:/project/app-a/nested:HOME_PATH"), window.bySPA.HOME_PATH);
});

test("demo loads init before routes, router, and runtime", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "demo", "index.html"), "utf8");
  const scripts = [...source.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map((match) => match[1]);
  assert.ok(scripts.indexOf("./_init.js") < scripts.indexOf("./_routes.js"));
  assert.ok(scripts.indexOf("./_routes.js") < scripts.indexOf("../_router.js"));
  assert.ok(scripts.indexOf("../_router.js") < scripts.indexOf("../_spa.js"));
});
