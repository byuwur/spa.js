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
    res.end('<!doctype html><html><head></head><body><main id="spa-content"></main><div id="spa-loader"></div></body></html>');
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});
});

test.after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function openApp(route = "/known") {
  const page = await browser.newPage();
  await page.goto(`${origin}/app/#${route}`);
  for (const file of ["js/jquery.min.js", "_functions.js", "_common.js", "app/_init.js"])
    await page.addScriptTag({ url: `${origin}/${file}` });
  await page.evaluate(() => {
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
  });
  await page.addScriptTag({ url: `${origin}/_router.js` });
  await page.addScriptTag({ url: `${origin}/_spa.js` });
  await page.waitForFunction(() => events.some(event => event.type === "bySPA:load"));
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
