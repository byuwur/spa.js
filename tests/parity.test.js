const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { source } = require("./parity-source");

function queryContract(code) {
  for (const [suffix, expected] of [
    ["#/known?q=a?b", "a?b"],
    ["#/known?q=a%3Fb", "a?b"],
    ["?q=document#/known?q=hash", "document"]
  ]) {
    const context = { window: { location: new URL(`https://example.test/app/${suffix}`) }, URL, URLSearchParams };
    vm.createContext(context);
    vm.runInContext(code, context);
    assert.equal(context.get_url_param("q"), expected);
  }
}

test("shared helper satisfies the same query contract at the selected revision", () => {
  queryContract(source("_functions.js"));
});

test("mirror contract detects a deliberately mismatched helper", () => {
  const broken = source("_functions.js") + "\nget_url_param = () => null;";
  assert.throws(() => queryContract(broken), assert.AssertionError);
});
