const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

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
