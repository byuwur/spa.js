const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");

let server, browser, origin;
const root = path.join(__dirname, "..");

test.before(async () => {
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname.endsWith(".js")) {
      const file = pathname.endsWith("/_init.js") ? "_init.js" : pathname.slice(1);
      const target = path.resolve(root, file);
      if (target.startsWith(root + path.sep) && fs.existsSync(target)) {
        res.setHeader("Content-Type", "text/javascript");
        return res.end(fs.readFileSync(target));
      }
    }
    res.setHeader("Content-Type", "text/html");
    res.end('<!doctype html><html><head></head><body><main id="spa-content"></main><div id="spa-loader"></div><div id="section">Section</div></body></html>');
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});
});

test.after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function openApp(route = "/known", options = {}) {
  const page = await browser.newPage();
  const appPath = options.appPath || "/app/";
  await page.goto(`${origin}${appPath}${route === null ? "" : "#" + route}`);
  for (const file of ["js/jquery.min.js", "_functions.js", "_common.js", `${appPath.slice(1)}_init.js`])
    await page.addScriptTag({ url: `${origin}/${file}` });
  await page.evaluate(options => {
    $.fx.off = true;
    window.events = [];
    window.requests = [];
    $.ajax = config => {
      requests.push(config.url);
      const result = $.Deferred();
      setTimeout(() => result.resolve('<p id="rendered">Loaded</p>'), 0);
      return result.promise();
    };
    for (const type of ["bySPA:before-unload", "bySPA:load", "bySPA:error"])
      document.addEventListener(type, event => events.push({ type, ...event.detail }));
    bySPA.ROUTES = {
      "/": { URI: "home.html" },
      "/known": { URI: "known.html" },
      "/configured": { URI: "known.html?q=a?b" }
    };
    if (options.storedURL) {
      byStorage.setItem("URI", "/known");
      byStorage.setItem("URL", options.storedURL);
      const storedRoutes = { ...bySPA.ROUTES };
      if (options.staleRoutes) storedRoutes["/missing"] = { URI: "known.html" };
      byStorage.setItem("ROUTES", JSON.stringify(storedRoutes));
    }
  }, options);
  await page.addScriptTag({ url: `${origin}/_router.js` });
  await page.addScriptTag({ url: `${origin}/_spa.js` });
  await page.waitForSelector("#rendered");
  return page;
}

test("bootstrap, navigation and URL helper preserve complete query values", async () => {
  for (const [suffix, expected, helper] of [
    ["?q=a?b", "a?b", "a?b"],
    ["?q=a%3Fb", "a?b", "a?b"],
    ["", null, null],
    ["?", null, null],
    ["?q=first&q=last", "last", "first"],
    ["?q=%ZZ", "%ZZ", "%ZZ"]
  ]) {
    const page = await openApp(`/known${suffix}`);
    assert.equal(await page.evaluate(() => JSON.parse(byStorage.getItem("_GET")).q ?? null), expected);
    assert.equal(await page.evaluate(() => get_url_param("q")), helper);
    await page.evaluate(suffix => bySPA.load(`/known${suffix}`), suffix);
    assert.equal(await page.evaluate(() => bySPA._GET.q ?? null), expected);
    assert.equal(await page.evaluate(() => get_url_param("q")), helper);
    await page.close();
  }
  const page = await openApp("/configured");
  assert.equal(await page.evaluate(() => JSON.parse(byStorage.getItem("_GET")).q), "a?b");
  await page.evaluate(() => bySPA.load("/configured"));
  assert.equal(await page.evaluate(() => bySPA._GET.q), "a?b");
  await page.close();
});

test("request helper rebind preserves consumer handlers and supports multiple events and elements", async () => {
  const page = await openApp();
  const result = await page.evaluate(async () => {
    document.body.insertAdjacentHTML("beforeend", '<form id="one"><button type="submit"></button></form><form id="two"><button type="submit"></button></form>');
    let plain = 0, named = 0;
    $("#one").on("submit", () => plain++).on("submit.consumer", () => named++);
    for (const id of ["one", "one", "two"])
      element_make_http_request({ $elementId: `#${id}`, $url: "/request", $trigger: "submit change", loudFail: false });
    requests.length = 0;
    for (const [id, type] of [["one", "submit"], ["one", "change"], ["two", "submit"]])
      document.getElementById(id).dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
    return { plain, named, count: requests.length };
  });
  assert.deepEqual(result, { plain: 1, named: 1, count: 3 });
  await page.close();
});

test("error-page overrides precede bounded default fallbacks", async () => {
  for (const options of [
    { custom: "/custom.html", failures: 0 },
    { custom: "/custom.html?theme=dark", failures: 0 },
    { custom: "/custom.html", failures: 1 },
    { custom: "", failures: 0 },
    { custom: "/custom.html", failures: 4 },
    { failures: 3 }
  ]) {
    const page = await openApp();
    const result = await page.evaluate(async options => {
      bySPA.ERROR_PATH = options.custom;
      requests.length = 0;
      $.ajax = config => {
        requests.push(config.url);
        const request = $.Deferred();
        if (requests.length <= options.failures) request.reject({ status: 404 });
        else request.resolve('<p id="error-rendered">Error page</p>');
        return request.promise();
      };
      const html = await bySPA.errorPage(404, "Missing");
      return { requests, html, rendered: document.getElementById("error-rendered")?.textContent };
    }, options);
    const paths = [
      options.custom && `${options.custom}${options.custom.includes("?") ? "&" : "?"}e=404`,
      `${origin}/app/_error.html?e=404`,
      `${origin}/app/spa.js/_error.html?e=404`,
      `${origin}/app/../_error.html?e=404`
    ].filter(Boolean);
    assert.deepEqual(result.requests, paths.slice(0, options.failures + 1));
    if (options.failures >= paths.length) assert.equal(result.html, null);
    else assert.equal(result.rendered, "Error page");
    await page.close();
  }
});


test("bootstrap consumes an explicit missing route instead of the saved route", async () => {
  for (const staleRoutes of [false, true]) {
    const page = await openApp("/missing", { storedURL: "/known", staleRoutes });
    const result = await page.evaluate(() => ({
      requests,
      navigations: events.filter(event => event.type === "bySPA:before-unload").length,
      error: bySPA.ROUTER_ERROR,
      storedError: byStorage.getItem("ROUTER_ERROR")
    }));
    assert.deepEqual(result.requests, [`${origin}/app/_error.html?e=404`]);
    assert.equal(result.navigations, 1);
    assert.equal(result.error, undefined);
    assert.equal(result.storedError, null);
    await page.close();
  }
  for (const [route, fragment] of [["/known", "known.html"], [null, "home.html"]]) {
    const page = await openApp(route, { storedURL: "/configured" });
    assert.ok(await page.evaluate(fragment => requests[0].includes(fragment), fragment));
    await page.evaluate(async () => {
      requests.length = 0;
      await bySPA.load("/missing");
    });
    assert.deepEqual(await page.evaluate(() => requests), [`${origin}/app/_error.html?e=404`]);
    await page.close();
  }
});

test("consent initialization uses migrated namespaced preferences and existing fallback", async () => {
  const page = await openApp();
  const result = await page.evaluate(async () => {
    window.consent = [];
    window.cookieconsent = { run: config => consent.push(config) };
    const run = async () => {
      consent.length = 0;
      byCommon.COOKIE_CONSENT_READY = false;
      byCommon.init();
      await new Promise(resolve => $(resolve));
      return consent[0] && { palette: consent[0].palette, language: consent[0].language };
    };
    const defaults = await run();
    localStorage.setItem("bySPA:/other:APP_THEME", "other");
    localStorage.setItem("bySPA:/other:APP_LANG", "other");
    const isolated = await run();
    localStorage.setItem("APP_THEME", "light");
    localStorage.setItem("APP_LANG", "en");
    byStorage.getItem("APP_THEME");
    byStorage.getItem("APP_LANG");
    const migrated = await run();
    const removedLegacy = localStorage.getItem("APP_THEME") === null && localStorage.getItem("APP_LANG") === null;
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = Storage.prototype.setItem = () => { throw Error("storage denied"); };
    byStorage.setItem("APP_THEME", "dark");
    byStorage.setItem("APP_LANG", "fr");
    const fallback = await run();
    const storedFallback = { palette: byStorage.getItem("APP_THEME"), language: byStorage.getItem("APP_LANG") };
    Storage.prototype.getItem = getItem;
    Storage.prototype.setItem = setItem;
    return { defaults, isolated, migrated, removedLegacy, fallback, storedFallback };
  });
  assert.deepEqual(result.defaults, { palette: "dark", language: "es" });
  assert.deepEqual(result.isolated, result.defaults);
  assert.deepEqual(result.migrated, { palette: "light", language: "en" });
  assert.equal(result.removedLegacy, true);
  assert.deepEqual(result.fallback, { palette: "dark", language: "fr" });
  assert.deepEqual(result.fallback, result.storedFallback);
  await page.close();
});

test("both click handlers preserve browser ownership and intercept owned ordinary links once", async () => {
  const page = await openApp();
  const results = await page.evaluate(async origin => {
    // Let common's ready callback bind links before dispatching actual DOM events.
    const cases = [
      [origin + "/app/#section", {}, true], [origin + "/app/#absent", {}, false],
      ["https://example.org/#section", {}, false], [origin + "/sibling/#section", {}, false],
      [origin + "/app/#/known", {}, true], [origin + "/app-two/unknown", {}, false],
      [origin + "/app/known", {}, true], [origin + "/app/#/known", { ctrlKey: true }, false],
      [origin + "/app/#/known", { button: 1 }, false], [origin + "/app/#/known", { target: "frame" }, false],
      [origin + "/app/#/known", { download: true }, false],
      [origin + "/app/#/known", { shiftKey: true }, false],
      [origin + "/app/#/known", { altKey: true }, false],
      [origin + "/app/#/known", { metaKey: true }, false],
      [origin + "/app/#/known", { target: "_blank" }, false],
      [origin + "/app/#/known", { customFolder: true }, false],
      [origin + "/known", {}, true]
    ];
    const results = [];
    for (const [href, props, expected] of cases) {
      const anchor = document.createElement("a"); anchor.href = href;
      if (props.target) anchor.target = props.target;
      if (props.download) anchor.setAttribute("download", "");
      if (props.customFolder) anchor.setAttribute("custom-folder", "true");
      document.body.append(anchor);
      byCommon.init();
      await new Promise(resolve => $(resolve));
      let prevented;
      const observe = event => { prevented = event.defaultPrevented; event.preventDefault(); };
      window.addEventListener("click", observe, { once: true });
      const before = events.length;
      anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...props }));
      results.push({ href, expected, prevented, navigations: events.slice(before).filter(e => e.type === "bySPA:before-unload").length });
      anchor.remove();
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    return results;
  }, origin);
  for (const result of results) { assert.equal(result.prevented, result.expected, result.href); assert.ok(result.navigations <= 1); }
  await page.close();
});

test("root-hosted routes and sibling-document fragments keep their navigation owners", async () => {
  const page = await openApp("/known", { appPath: "/" });
  await page.evaluate(() => {
    document.body.insertAdjacentHTML("beforeend", '<a id="route-link" href="/configured">Route</a><a id="sibling-link" href="/sibling/#section">Sibling</a>');
  });
  await page.click("#route-link");
  await page.waitForURL("**/#/configured");
  assert.equal(await page.evaluate(() => events.filter(event => event.type === "bySPA:before-unload").length), 2);
  await page.evaluate(async () => {
    byCommon.init();
    await new Promise(resolve => $(resolve));
  });
  await page.click("#sibling-link");
  await page.waitForURL("**/sibling/#section");
  assert.equal(await page.evaluate(() => typeof bySPA), "undefined");
  await page.close();
});

test("existing targets scroll while missing targets retain native hash navigation", async () => {
  const page = await openApp();
  await page.evaluate(async () => {
    document.body.insertAdjacentHTML("beforeend", '<a id="existing-link" href="#section">Existing</a><a id="missing-link" href="#absent">Missing</a>');
    byCommon.init();
    await new Promise(resolve => $(resolve));
  });
  await page.click("#existing-link");
  assert.equal(new URL(page.url()).hash, "#/known");
  await page.click("#missing-link");
  await page.waitForURL("**/#absent");
  assert.equal(await page.evaluate(() => events.filter(event => event.type === "bySPA:before-unload").length), 1);
  await page.close();
});

test("navigation journey preserves error recovery and FILE history", async () => {
  const page = await openApp();
  await page.evaluate(async () => {
    bySPA.ROUTES["/slow"] = { URI: "slow.html" };
    const ajax = $.ajax;
    let finish;
    $.ajax = config => {
      if (!config.url.includes("slow.html")) return ajax(config);
      const request = $.Deferred();
      finish = () => request.resolve('<p id="stale">Old route</p>');
      return request.promise();
    };
    const slow = bySPA.load("/slow");
    await bySPA.load("/known");
    finish();
    await slow;
    if (document.getElementById("stale")) throw Error("Stale navigation replaced the current route");
    await bySPA.load("/missing");
  });
  // Unknown routes retain the existing history policy; Back leaves the last successful URL.
  await Promise.all([page.waitForEvent("load"), page.goBack()]);
  await page.waitForURL("**/#/slow");
  for (const file of ["js/jquery.min.js", "_functions.js", "_common.js", "app/_init.js"])
    await page.addScriptTag({ url: `${origin}/${file}` });
  await page.evaluate(() => {
    bySPA.ROUTES = { "/slow": { URI: "known.html" }, "/file": { FILE: "asset.html" } };
  });
  await page.addScriptTag({ url: `${origin}/_router.js` });
  await page.addScriptTag({ url: `${origin}/_spa.js` });
  await page.evaluate(() => { bySPA.load("/file"); });
  await page.waitForURL("**/app/asset.html");
  await page.goBack();
  await page.waitForURL("**/#/slow");
  await page.close();
});
