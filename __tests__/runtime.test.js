const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// ===== RUNTIME TESTS =====
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
      getItem() {
        throw new Error("unavailable");
      },
      setItem() {
        throw new Error("unavailable");
      },
      removeItem() {
        throw new Error("unavailable");
      }
    }
  };
  vm.runInNewContext(source, { URL, console: { log() {} }, document, window: fallbackWindow });
  fallbackWindow.byStorage.setItem("CUSTOM", "memory");
  assert.equal(fallbackWindow.byStorage.getItem("CUSTOM"), "memory");
  fallbackWindow.byStorage.removeItem("CUSTOM");
  assert.equal(fallbackWindow.byStorage.getItem("CUSTOM"), null);
});

function storageHarness(values = new Map()) {
  const failure = { write: false, remove: false };
  const window = {
    location: new URL("https://example.test/app/"),
    localStorage: {
      getItem(key) {
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        if (failure.write) throw new Error("write denied");
        values.set(key, String(value));
      },
      removeItem(key) {
        if (failure.remove === true || failure.remove === key) throw new Error("remove denied");
        values.delete(key);
      }
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "_init.js"), "utf8"), {
    window,
    URL,
    document: { currentScript: { getAttribute: () => "/app/_init.js" } },
    console: { log() {} }
  });
  return { storage: window.byStorage, values, failure };
}

test("partial storage failure gives only failed keys local authority until explicit recovery", () => {
  const { storage, values, failure } = storageHarness();
  const diskX = `${storage.prefix}X`;
  const diskY = `${storage.prefix}Y`;
  const diskZ = `${storage.prefix}Z`;
  storage.setItem("X", "old");
  storage.setItem("Z", "original");
  assert.equal(storage.getItem("X"), "old");
  values.set(diskZ, "external");
  assert.equal(storage.getItem("Z"), "external");

  failure.write = true;
  storage.setItem("X", "new");
  storage.setItem("Y", "created");
  assert.equal(storage.getItem("X"), "new");
  assert.equal(storage.getItem("Y"), "created");
  assert.equal(values.get(diskX), "old");
  assert.equal(values.has(diskY), false);
  values.set(diskZ, "another tab");
  assert.equal(storage.getItem("Z"), "another tab");

  failure.remove = true;
  storage.removeItem("X");
  assert.equal(storage.getItem("X"), null);
  assert.equal(values.get(diskX), "old");
  storage.setItem("X", "replacement");
  assert.equal(storage.getItem("X"), "replacement");

  failure.write = false;
  values.set(diskX, "newer disk");
  assert.equal(storage.getItem("X"), "replacement");
  assert.equal(values.has(diskY), false); // Recovery does not replay failed writes.
  storage.setItem("X", "persisted");
  assert.equal(values.get(diskX), "persisted");
  values.set(diskX, "external after recovery");
  assert.equal(storage.getItem("X"), "external after recovery");

  values.set("X", "legacy");
  storage.removeItem("X");
  failure.remove = false;
  assert.equal(storage.getItem("X"), null);
  storage.removeItem("X");
  assert.equal(values.has(diskX), false);
  assert.equal(values.has("X"), false);
  values.set(diskX, "external after removal");
  assert.equal(storage.getItem("X"), "external after removal");
});

test("failed migration keeps legacy data safe and removals cannot remigrate it", () => {
  const { storage, values, failure } = storageHarness(new Map([["CUSTOM", "legacy"]]));
  const diskKey = `${storage.prefix}CUSTOM`;
  failure.write = true;
  assert.equal(storage.getItem("CUSTOM"), "legacy");
  assert.equal(values.has(diskKey), false);
  assert.equal(values.get("CUSTOM"), "legacy");
  values.set(diskKey, "external");
  assert.equal(storage.getItem("CUSTOM"), "legacy");
  failure.remove = true;
  storage.removeItem("CUSTOM");
  assert.equal(storage.getItem("CUSTOM"), null);
  failure.remove = failure.write = false;
  assert.equal(storage.getItem("CUSTOM"), null);
  storage.removeItem("CUSTOM");
  assert.equal(values.has(diskKey), false);
  assert.equal(values.has("CUSTOM"), false);
  assert.equal(storage.getItem("CUSTOM"), null);

  values.set("CUSTOM", "fresh legacy");
  assert.equal(storage.getItem("CUSTOM"), "fresh legacy");
  assert.equal(values.get(diskKey), "fresh legacy");
  assert.equal(values.has("CUSTOM"), false);

  values.set("CUSTOM", "legacy not yet removed");
  failure.remove = "CUSTOM";
  storage.removeItem("CUSTOM");
  assert.equal(values.has(diskKey), false);
  assert.equal(values.get("CUSTOM"), "legacy not yet removed");
  assert.equal(storage.getItem("CUSTOM"), null);
  failure.remove = false;
  storage.removeItem("CUSTOM");
  assert.equal(storage.getItem("CUSTOM"), null);
});

test("duplicate environment setup preserves preconfigured namespaces and memory-only values", () => {
  for (const file of ["_init.js", "demo/_init.js"]) {
    const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    const window = {
      bySPA: { REQUEST_TIMEOUT: 4321 },
      byStorage: { custom: true },
      location: new URL("https://example.test/app/"),
      localStorage: {
        getItem() {
          throw Error("denied");
        },
        setItem() {
          throw Error("denied");
        },
        removeItem() {
          throw Error("denied");
        }
      }
    };
    const context = {
      window,
      URL,
      console: { log() {} },
      document: { currentScript: { getAttribute: () => "/app/_init.js" } }
    };
    vm.runInNewContext(source, context);
    const storage = window.byStorage;
    assert.equal(storage.initialized, true);
    assert.equal(window.bySPA.initialized, undefined);
    const getItem = storage.getItem;
    storage.setItem("unsaved", "local");
    window.bySPA.NAVIGATION_ID = 7;
    vm.runInNewContext(source, context);
    assert.equal(window.byStorage, storage);
    assert.equal(storage.getItem, getItem);
    assert.equal(storage.getItem("unsaved"), "local");
    assert.equal(storage.custom, true);
    assert.equal(window.bySPA.REQUEST_TIMEOUT, 4321);
    assert.equal(window.bySPA.NAVIGATION_ID, 7);
  }
});
