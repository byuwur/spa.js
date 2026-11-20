const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium, firefox, webkit } = require("playwright");
const engine = process.env.BROWSER_ENGINE || "chromium";
assert.ok(["chromium", "firefox", "webkit"].includes(engine), "Unsupported BROWSER_ENGINE");
const browserType = { chromium, firefox, webkit }[engine];
const launchOptions = { timeout: 10000, ...(engine === "chromium" ? { channel: process.env.BROWSER_CHANNEL || process.env.PLAYWRIGHT_CHANNEL, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}) };
const { source } = require("./parity-source");

let server, browser, origin;
const root = path.join(__dirname, "..");

test.before(async () => {
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname.endsWith(".js")) {
      const file = pathname.endsWith("/_init.js") && pathname !== "/demo/_init.js" ? "_init.js" : pathname.slice(1);
      const target = path.resolve(root, file);
      if (target.startsWith(root + path.sep) && fs.existsSync(target)) {
        res.setHeader("Content-Type", "text/javascript");
        return res.end(source(file));
      }
    }
    res.setHeader("Content-Type", "text/html");
    res.end(
      /* HTML */ `<!doctype html>
        <html>
          <head></head>
          <body>
            <main id="spa-content"></main>
            <div id="spa-loader"></div>
            <div id="section">Section</div>
          </body>
        </html>`
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await browserType.launch(launchOptions);
});

test.after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

// =============
// BROWSER TESTS
// =============
test("privacy links and buttons reopen one panel without changing consent or the current route", async (t) => {
  const page = await browser.newPage();
  t.after(() => page.close());
  const url = "https://privacy.test/page";
  await page.route(url, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<a href="#cookie-controls">Cookies</a><button data-target="#privacy-controls">Preferences</button>'
    })
  );
  await page.goto(url + "#privacy-controls");
  await page.addScriptTag({ path: path.join(__dirname, "../_privacy.js") });
  await page.evaluate(() => {
    window.choices = [];
    const controls = byCommon.initPrivacyControls({
      onChoice(value) {
        choices.push(value);
        controls.update(true, value);
      }
    });
    controls.update(true, "no");
    byCommon.initPrivacyControls();
  });
  const panel = page.locator("#privacy-controls");
  assert.equal(await panel.count(), 1);
  assert.ok(await panel.isVisible());
  await panel.getByRole("button", { name: "Close" }).click();
  await page.evaluate(() => history.replaceState(null, "", "#existing-route"));
  await page.getByRole("link", { name: "Cookies" }).click();
  assert.ok(await panel.isVisible());
  assert.equal(new URL(page.url()).hash, "#existing-route");
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => document.activeElement.textContent), "Cookies");
  await page.getByRole("button", { name: "Preferences" }).click();
  await panel.getByRole("button", { name: "Accept", exact: true }).click();
  assert.deepEqual(await page.evaluate(() => choices), ["yes"]);
  assert.equal(await panel.isVisible(), false);
  await page.evaluate(() => {
    const slot = document.createElement("div");
    slot.dataset.privacyInline = "on-load";
    document.body.prepend(slot);
    byCommon.initPrivacyControls().update(true, "yes");
  });
  assert.ok(await page.locator("[data-privacy-inline] #privacy-controls").isVisible());
  assert.equal(await panel.evaluate((el) => getComputedStyle(el).position), "static");
  await page.evaluate(() => byCommon.initPrivacyControls().update(false, "yes"));
  assert.ok(await panel.isVisible());
  assert.ok(await panel.locator("[data-close]").isVisible());
  await panel.locator("[data-close]").click();
  await page.evaluate(() => byCommon.initPrivacyControls().update(true, "yes"));
  assert.equal(await panel.isVisible(), false);
  await page.getByRole("button", { name: "Preferences" }).click();
  assert.ok(await panel.isVisible());
  await panel.getByRole("button", { name: "Reject", exact: true }).click();
  assert.equal(await panel.isVisible(), false);
  await page.evaluate(() => {
    const slot = document.querySelector("[data-privacy-inline]");
    slot.replaceWith(slot.cloneNode(false));
    byCommon.initPrivacyControls().update(true, "no");
  });
  assert.ok(await panel.isVisible());
  assert.equal(await panel.getByRole("status").textContent(), "You have rejected analytics.");
  assert.deepEqual(await page.evaluate(() => choices), ["yes", "no"]);
});

test("closing the themed banner persists across hosts without recording consent", async (t) => {
  const context = await browser.newContext();
  t.after(() => context.close());
  await context.route("https://*.example.test/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<html lang="en" data-bs-theme="light"><body><a href="#privacy-controls">Manage privacy</a></body></html>'
    })
  );
  const page = await context.newPage();
  async function mount(host) {
    await page.goto("https://" + host + ".example.test/");
    await page.addScriptTag({ path: path.join(__dirname, "../_privacy.js") });
    await page.evaluate(() => {
      window.choices = [];
      const controls = byCommon.initPrivacyControls({
        policyURL: "/privacy",
        cookiesURL: "/cookies",
        dismissalDomain: "example.test",
        onChoice: (value) => choices.push(value)
      });
      controls.update();
    });
  }

  await mount("viewer");
  const panel = page.locator("#privacy-controls");
  assert.equal(await panel.locator("strong").innerText(), "Your privacy");
  assert.equal(await panel.locator("[data-status]").isVisible(), false);
  assert.doesNotMatch(await panel.innerText(), /No choice saved|Preview only/);
  assert.ok(await panel.locator("[data-links]").evaluate((el) => el.getBoundingClientRect().top >= el.previousElementSibling.getBoundingClientRect().bottom));
  const background = () => panel.evaluate((el) => getComputedStyle(el).backgroundColor);
  assert.equal(await background(), "rgb(255, 255, 255)");
  await page.evaluate(() => {
    document.documentElement.dataset.bsTheme = "dark";
  });
  assert.equal(await background(), "rgb(17, 17, 17)");
  const colors = await panel.locator("[data-close], [data-choice]").evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).backgroundColor));
  assert.equal(new Set(colors).size, 3);

  await panel.locator("[data-close]").click();
  assert.deepEqual(await page.evaluate(() => choices), []);
  await mount("viewer");
  assert.equal(await panel.isVisible(), false);
  await mount("editor");
  assert.equal(await panel.isVisible(), false);
  await page.getByRole("link", { name: "Manage privacy" }).click();
  assert.ok(await panel.isVisible());
  assert.equal(await panel.count(), 1);
  await panel.locator('[data-choice="no"]').click();
  assert.deepEqual(await page.evaluate(() => choices), ["no"]);
});

test("local URL helpers work without jQuery or SPA initialization", { timeout: 30000 }, async (t) => {
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  t.after(() => page.close());
  await page.addScriptTag({ path: path.join(__dirname, "../_functions.js") });
  const result = await page.evaluate(async () => {
    const text = JSON.stringify([{ platform: "twitch", handle: "/byUwUr 😀" }]);
    const token = await compress_url_data(text);
    let limited = false;
    try {
      await decompress_url_data(token, 1);
    } catch (error) {
      limited = error instanceof RangeError;
    }
    return {
      roundTrip: (await decompress_url_data(new URLSearchParams({ data: token }).get("data"))) === text,
      urlSafe: /^[A-Za-z0-9_-]+$/.test(token),
      limited,
      standalone: typeof jQuery === "undefined" && typeof bySPA === "undefined"
    };
  });
  assert.deepEqual(result, { roundTrip: true, urlSafe: true, limited: true, standalone: true });
});

test("local HTML and CSRF utilities work without jQuery or SPA initialization", { timeout: 30000 }, async (t) => {
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  t.after(() => page.close());
  await page.route("https://utilities.test/**", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><head></head><body></body>" }));
  await page.goto("https://utilities.test/");
  await page.addScriptTag({ path: path.join(__dirname, "../_functions.js") });
  const result = await page.evaluate(() => {
    const escaped = [escape_html('<img src=x onerror="alert(1)">&'), escape_html(null), escape_html(undefined), escape_html(0), escape_html(false), escape_html("Caf\u00e9 \u{1f600}")];
    sessionStorage.setItem("CSRF_TOKEN", "stored-token");
    const meta = document.createElement("meta");
    meta.name = "csrf-token";
    meta.content = "meta-token";
    document.head.append(meta);
    const preferred = get_csrf_token();
    const payload = [{ name: "message", value: "Hello" }];
    const sameArray = add_csrf_token(payload) === payload;
    add_csrf_token(payload);
    const explicit = [{ name: "_csrf", value: "explicit-token" }];
    add_csrf_token(explicit);
    const readOnly = add_csrf_token([], "get");
    meta.content = "";
    const fallback = get_csrf_token();
    meta.remove();
    sessionStorage.removeItem("CSRF_TOKEN");
    return { escaped, preferred, fallback, missing: get_csrf_token(), payload, explicit, readOnly, sameArray, standalone: typeof jQuery === "undefined" && typeof bySPA === "undefined" };
  });
  assert.deepEqual(result, {
    escaped: ['&lt;img src=x onerror="alert(1)"&gt;&amp;', "", "", "0", "false", "Caf\u00e9 \u{1f600}"],
    preferred: "meta-token",
    fallback: "stored-token",
    missing: "",
    payload: [
      { name: "message", value: "Hello" },
      { name: "_csrf", value: "meta-token" }
    ],
    explicit: [{ name: "_csrf", value: "explicit-token" }],
    readOnly: [],
    sameArray: true,
    standalone: true
  });
});

async function openApp(route = "/known", options = {}) {
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const appPath = options.appPath || "/app/";
  await page.goto(`${origin}${appPath}${route === null ? "" : `#${route}`}`);
  for (const file of ["js/jquery.min.js", "_functions.js", "_common.js", `${appPath.slice(1)}_init.js`]) await page.addScriptTag({ url: `${origin}/${file}` });
  await page.evaluate((options) => {
    $.fx.off = true;
    window.events = [];
    window.requests = [];
    window.requestEvents = [];
    $.ajax = (config) => {
      requests.push(config.url);
      requestEvents.push(events.map((event) => event.type));
      const result = $.Deferred();
      setTimeout(() => result.resolve(/* HTML */ `<p id="rendered">Loaded</p>`), 0);
      return result.promise();
    };
    for (const type of ["bySPA:before-unload", "bySPA:load", "bySPA:error"]) document.addEventListener(type, (event) => events.push({ type, ...event.detail }));
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

test("known navigation ends in load and missing routes notify before error rendering", { timeout: 30000 }, async () => {
  const success = await openApp();
  await success.waitForFunction(() => events.some((event) => event.type === "bySPA:load"));
  assert.deepEqual(await success.evaluate(() => events.map((event) => event.type)), ["bySPA:before-unload", "bySPA:load"]);
  await success.close();

  for (const initial of [false, true]) {
    const page = await openApp(initial ? "/missing" : "/known");
    if (!initial)
      await page.evaluate(async () => {
        events.length = requests.length = requestEvents.length = 0;
        await bySPA.load("/missing");
      });
    const result = await page.evaluate(() => ({ events, requests, requestEvents }));
    assert.deepEqual(
      result.events.map((event) => event.type),
      ["bySPA:before-unload", "bySPA:error"]
    );
    const error = result.events[1];
    assert.deepEqual(error, {
      type: "bySPA:error",
      navigationId: result.events[0].navigationId,
      url: "/missing",
      status: 404,
      error: 'Route "/missing" does not exist.'
    });
    assert.deepEqual(result.requests, [`${origin}/app/_error.html?e=404`]);
    assert.deepEqual(result.requestEvents, [["bySPA:before-unload", "bySPA:error"]]);
    await page.close();
  }
});

test("a component refresh or clear supersedes older requests on the same route", { timeout: 30000 }, async (t) => {
  const page = await openApp();
  t.after(() => page.close());
  const result = await page.evaluate(async () => {
    const slot = document.body.appendChild(document.createElement("aside"));
    slot.id = "refresh-slot";
    const pending = [];
    $.ajax = () => {
      const request = $.Deferred();
      pending.push(request);
      return request.promise();
    };
    const old = bySPA.reloadComponent("#refresh-slot", "old");
    const fresh = bySPA.reloadComponent("#refresh-slot", "fresh");
    pending[1].resolve("new");
    await fresh;
    pending[0].reject({ status: 503 });
    await old;
    const afterFailure = slot.textContent;
    const late = bySPA.reloadComponent("#refresh-slot", "late");
    bySPA.reloadComponent("#refresh-slot", "");
    pending[2].resolve("old");
    await late;
    return [afterFailure, slot.textContent];
  });
  assert.deepEqual(result, ["new", ""]);
});

test("stale failures cannot notify, replace content, or hide a newer loader", { timeout: 30000 }, async () => {
  for (const completeNewerFirst of [true, false]) {
    const page = await openApp();
    const result = await page.evaluate(async (completeNewerFirst) => {
      events.length = 0;
      const pending = [];
      $.ajax = () => {
        const request = $.Deferred();
        pending.push(request);
        return request.promise();
      };
      const older = bySPA.load("/known");
      const newer = bySPA.load("/configured");
      if (completeNewerFirst) {
        pending[1].resolve(/* HTML */ `<p id="current">Current route</p>`);
        await newer;
      }
      const before = { html: $("#spa-content").html(), loader: $("#spa-loader").css("display") };
      pending[0].reject({ status: 500, responseText: "Stale error" }, "error", "old failure");
      await older;
      const after = { html: $("#spa-content").html(), loader: $("#spa-loader").css("display") };
      if (!completeNewerFirst) {
        pending[1].resolve(/* HTML */ `<p id="current">Current route</p>`);
        await newer;
      }
      return { before, after, events, current: document.getElementById("current")?.textContent };
    }, completeNewerFirst);
    assert.deepEqual(result.after, result.before);
    assert.equal(result.current, "Current route");
    assert.deepEqual(
      result.events.map((event) => event.type),
      ["bySPA:before-unload", "bySPA:before-unload", "bySPA:load"]
    );
    assert.equal(result.events[2].navigationId, result.events[1].navigationId);
    await page.close();
  }
});

test("duplicate runtime scripts preserve active navigation and bind handlers once", { timeout: 30000 }, async (t) => {
  const page = await openApp();
  t.after(() => page.close());
  await page.evaluate(() => {
    window.savedRuntime = { load: bySPA.load, common: byCommon.init, memory: byStorage.memory, navigation: bySPA.NAVIGATION_ID, history: bySPA.HISTORY_INDEX, requests: requests.length, events: events.length };
  });
  for (const file of ["_common.js", "_spa.js"]) await page.addScriptTag({ content: source(file) });
  assert.equal(await page.evaluate(() => bySPA.initialized === true && byCommon.initialized === true), true);
  assert.deepEqual(
    await page.evaluate(() => ({
      sameLoad: bySPA.load === savedRuntime.load,
      sameCommon: byCommon.init === savedRuntime.common,
      sameMemory: byStorage.memory === savedRuntime.memory,
      sameNavigation: bySPA.NAVIGATION_ID === savedRuntime.navigation,
      sameHistory: bySPA.HISTORY_INDEX === savedRuntime.history,
      sameRequests: requests.length === savedRuntime.requests,
      sameEvents: events.length === savedRuntime.events
    })),
    { sameLoad: true, sameCommon: true, sameMemory: true, sameNavigation: true, sameHistory: true, sameRequests: true, sameEvents: true }
  );
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.href = "/app/known";
    link.textContent = "Known route";
    document.body.append(link);
    link.click();
  });
  await page.waitForFunction(() => events.length > savedRuntime.events && events.at(-1).type === "bySPA:load");
  assert.equal(await page.evaluate(() => requests.length - savedRuntime.requests), 1);
});

test("navigation waits for external and inline fragment scripts before announcing load", { timeout: 30000 }, async (t) => {
  const page = await openApp();
  t.after(() => page.close());
  await page.route("**/release-dependency.js", (route) => route.fulfill({ contentType: "text/javascript", body: "window.releaseOrder.push('external'); window.releaseDependency = 42;" }));
  const result = await page.evaluate(async () => {
    window.releaseOrder = [];
    document.addEventListener("bySPA:load", () => releaseOrder.push("loaded"), { once: true });
    $.ajax = () =>
      $.Deferred()
        .resolve(/* HTML */ `
          <p id="release-fragment">Loaded</p>
          <script src="/release-dependency.js"></script>
          <script>
            window.releaseOrder.push(window.releaseDependency === 42 ? "inline" : "missing dependency");
          </script>
        `)
        .promise();
    await bySPA.load("/configured");
    return { order: releaseOrder, content: document.getElementById("release-fragment")?.textContent };
  });
  assert.deepEqual(result, { order: ["external", "inline", "loaded"], content: "Loaded" });
});
