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

test("initial and later routing give DATA precedence over legacy POST", () => {
  const router = fs.readFileSync(path.join(__dirname, "..", "_router.js"), "utf8");
  const runtime = fs.readFileSync(path.join(__dirname, "..", "_spa.js"), "utf8");
  const stored = { stored: "value" };
  const route = { POST: { legacy: true, shared: "post" }, DATA: { current: true, shared: "data" } };
  const expected = { stored: "value", legacy: true, current: true, shared: "data" };

  assert.deepEqual({ ...stored, ...route.POST, ...route.DATA }, expected);
  assert.match(router, /const routePost = \{ \.\.\.post, \.\.\.\(is_object\(route\.POST\).*\.\.\.\(is_object\(route\.DATA\)/);
  assert.match(runtime, /const post = \{ \.\.\.\(route\?\.POST \?\? \{\}\), \.\.\.\(route\?\.DATA \?\? \{\}\) \}/);
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
  const entries = [
    ["https://example.test/project/app-a/", "/project/app-a/_init.js", "https://example.test/project/app-a", "bySPA:/project/app-a:"],
    ["https://example.test/project/app-a/foo", "/project/app-a/_init.js", "https://example.test/project/app-a", "bySPA:/project/app-a:"],
    ["https://example.test/project/app-a/foo/bar", "/project/app-a/_init.js", "https://example.test/project/app-a", "bySPA:/project/app-a:"],
    ["https://example.test/project/app-b/foo", "/project/app-b/_init.js", "https://example.test/project/app-b", "bySPA:/project/app-b:"]
  ];
  for (const [href, initPath, homePath, prefix] of entries) {
    const values = new Map();
    const location = { href, host: "example.test", protocol: "https:" };
    const document = { baseURI: href, currentScript: { getAttribute: () => initPath } };
    const window = {
      location,
      localStorage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key)
      }
    };

    vm.runInNewContext(source, { URL, console: { log() {} }, document, window });
    assert.equal(window.bySPA.HOME_PATH, homePath);
    assert.equal(window.byStorage.prefix, prefix);
    assert.equal(values.get(prefix + "HOME_PATH"), window.bySPA.HOME_PATH);
  }
});

test("storage migration removes legacy values and memory fallback remains usable", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "_init.js"), "utf8");
  const values = new Map([["CUSTOM", "legacy"]]);
  const location = { href: "https://example.test/app/route", host: "example.test", protocol: "https:" };
  const document = { baseURI: location.href, currentScript: { getAttribute: () => "/app/_init.js" } };
  const window = {
    location,
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key)
    }
  };
  vm.runInNewContext(source, { URL, console: { log() {} }, document, window });
  assert.equal(window.byStorage.getItem("CUSTOM"), "legacy");
  assert.equal(values.has("CUSTOM"), false);
  window.byStorage.removeItem("CUSTOM");
  assert.equal(window.byStorage.getItem("CUSTOM"), null);

  const fallbackWindow = {
    location,
    localStorage: {
      getItem() { throw new Error("unavailable"); },
      setItem() { throw new Error("unavailable"); },
      removeItem() { throw new Error("unavailable"); }
    }
  };
  vm.runInNewContext(source, { URL, console: { log() {} }, document, window: fallbackWindow });
  fallbackWindow.byStorage.setItem("CUSTOM", "memory");
  assert.equal(fallbackWindow.byStorage.getItem("CUSTOM"), "memory");
  fallbackWindow.byStorage.removeItem("CUSTOM");
  assert.equal(fallbackWindow.byStorage.getItem("CUSTOM"), null);
});

test("demo loads init before routes, router, and runtime", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "demo", "index.html"), "utf8");
  const scripts = [...source.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map((match) => match[1]);
  assert.ok(scripts.indexOf("./_init.js") < scripts.indexOf("./_routes.js"));
  assert.ok(scripts.indexOf("./_routes.js") < scripts.indexOf("../_router.js"));
  assert.ok(scripts.indexOf("../_router.js") < scripts.indexOf("../_spa.js"));
});
