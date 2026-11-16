# byuwur/spa.js

![SPA.js demo preview](prev.jpg)

A static single-page application framework with jQuery page/component loading, hash or path routing, translations, shared UI, and utility helpers.

[Demo](https://byuwur.github.io/spa.js) · [PHP version: SPA.php](https://github.com/byuwur/spa.php)

## Installation

Requires jQuery, HTTP(S), and a current browser. Optional features need their bundled libraries; no frontend install or build is needed.

```bash
git clone https://github.com/byuwur/spa.js.git
```

Serve the checkout and open `demo/`; the root redirects there. AJAX fragments cannot reliably load over `file://`, which shows a fallback notice.

## How is it done?

Keep the application shell, initializer, routes, pages, components, dictionaries, and assets outside the framework submodule:

```text
application-root/
|-- index.html      # Shell
|-- _init.js        # Application initializer
|-- _routes.js      # Route table
`-- spa.js/         # Framework
```

1. Copy the demo shell and framework `_init.js` into your application. Each SPA needs its own initializer and routes.
2. Define routes/components in `_routes.js` and add their HTML files.
3. Load jQuery, helpers, application initialization, optional language support, routes, `_router.js`, then `_spa.js`, as the demo does.

Use the application's initializer: its script URL sets paths and storage, so loading the framework template uses the wrong context. Hash routing needs no rewrites; path routing must serve `index.html` for non-file routes. The demo uses its parent as the framework root.

| Files                                 | Purpose                                                         |
| ------------------------------------- | --------------------------------------------------------------- |
| `_init.js`, `_router.js`              | Application bootstrap and initial route resolution.             |
| `_spa.js`                             | AJAX navigation, history, components, and lifecycle.            |
| `_functions.js`                       | Data, URL, cookie, request, WebSocket, modal, and form helpers. |
| `_common.js`, `_common.css`           | Shared UI initialization and styles.                            |
| `_load.js`                            | Native ordered CSS/JavaScript dependency loading.               |
| `_transitions.css`, `_transitions.js` | Shared page motion and opt-in content updates.                  |
| `_fonts.css`                          | Bundled fonts; imported by `_common.css`.                       |
| `_fonts.js`                           | Optional Google Fonts loading and pickers.                      |
| `_lang.js`                            | Optional language selection and `data-i18n` translations.       |
| `_error.html`                         | Standalone error page.                                          |
| `css/`, `js/`, `img/`                 | Bundled libraries and assets.                                   |

Load only needed libraries. Remote integrations need their services; shared CSS images live in the framework's `img/`. `.nojekyll` supports GitHub Pages.

Since v14, `_var.js` is `_init.js`; update old imports. No compatibility alias exists.

### Languages

`byCommon.getLanguage()` reads the language without loading dictionaries or writing preferences. `bySPA.setLanguage(lang)` and `byCommon.setLanguage(lang)` change it.

`_lang.js` chooses document `?lang=`, route queries, cookie, `localStorage.APP_LANG`, browser language, then `es`. It persists the choice and updates `<html lang>`. Dictionaries use dotted keys such as `nav.home`; `byCommon.LANG_PATH` overrides their location. The demo uses application-relative `/lang`.

## Runtime contracts

### Routes and navigation

- Fragments use GET. Route values override `/$/` parameters, which override queries; `DATA` overrides the legacy `POST` alias from initial routing onward.
- Missing explicit initial routes fail normally; saved routes cannot replace them. An absent route resolves to `/`. Only the first `?` separates path/query. Route objects keep the last duplicate value; `get_url_param()` keeps the first and prefers document queries over hash queries.
- Navigation emits `bySPA:before-unload`, then one `bySPA:load` or `bySPA:error`. Error details are `{ navigationId, url, status, error }`; status `0` means no transport status. `bySPA.REQUEST_TIMEOUT` defaults to 30 seconds.
- Superseded work cannot update the newer DOM/loader or emit a terminal event, including when lifecycle listeners start another navigation. Unknown routes report one 404 without adding history; exhausted error fallbacks add no second error. FILE routes leave without a load event.
- `HOME_PATH` owns the origin/path boundary. Ordinary same-origin links inside it, or configured fragment-free paths outside it, route through `_spa.js`. Modified/middle clicks, downloads, non-`_self` targets, prevented events, and `custom-folder="true"` stay native. `byCommon` scrolls existing same-document IDs; other ordinary fragments remain native.
- `bySPA.VERSION` identifies the framework; `bySPA.APP_VERSION` identifies the application.

### Storage and shared UI

Each API has one `initialized` flag. Bootstrap may populate its namespace before `_spa.js` sets `bySPA.initialized = true`. Reimports preserve active navigation and storage fallbacks; `byCommon.init()` still initializes new content.

`byStorage` namespaces keys by application root and removes legacy keys after migration. Failed writes/removals give that key a local value/null marker until an explicit change succeeds; other keys still read persistent storage. Fallback lasts only for this runtime, without automatic replay or cross-tab synchronization. Consent reads namespaced `APP_THEME`/`APP_LANG`, defaulting to `dark`/`es`.

`_spa.js` calls `byCommon.init()` after content changes; standalone pages must call it explicitly. Warnings default off: enable `byCommon.INIT_WARNINGS` or pass `{ showWarn: true }`. Public `byCommon.initSelect2Keyboard()` enables only Select2 keyboard behavior. `byCommon.initBootstrap({ tooltipsOnly: true, root, refreshTooltips: true })` refreshes scoped tooltips without other components.

Modal cleanup disposes optional font controls and removes the captured element, preserving replacements with the same ID. `byCommon.accessibilityText(mode)` uses `"plus"`/`"minus"` to change root size in `0.25rem` steps within `0.5rem`-`3rem`; no argument resets `1rem`.

After `byCommon.init()`, Up/Down in an open single-select Select2 commits the highlighted value, emits input/change and selection events, and keeps the dropdown open. Hover only highlights; multi-selects require confirmation. Dynamic controls and remote results work likewise; `select2:selecting` can cancel a change.

Data, HTML-text escaping, CSRF utilities, and WebSocket transport are native. UI, HTTP/form helpers, and WebSocket DOM logging use jQuery; modals also need Bootstrap.

### Compressed URL data

`compress_url_data(text)` and `decompress_url_data(token, maxBytes = 1048576)` return native Promises and use raw DEFLATE with unpadded Base64url, without jQuery or SPA initialization.

```js
const token = await compress_url_data(JSON.stringify(settings));
const restored = JSON.parse(await decompress_url_data(token));
```

Requires native `CompressionStream`/`DecompressionStream` support for `deflate-raw`. Decompression rejects malformed data/UTF-8 and output above the positive safe-integer UTF-8 byte limit. Callers own JSON, validation, URL parameters, and format markers.

### Ordered assets

`_load.js` provides native `byLoad(files, { host, before, defer })` without jQuery. CSS and classic JavaScript load in array order; await completion before app initialization. Default `defer: true` waits for DOM parsing; `defer: false` starts immediately, even in the head. Dynamic scripts do not delay `DOMContentLoaded`.

```html
<script src="https://cdn.jsdelivr.net/gh/byuwur/spa.js@v20.12/_load.min.js"></script>
<script>
  const SPA_VERSION = "v20.12";
  const HOST = `https://cdn.jsdelivr.net/gh/byuwur/spa.js@${SPA_VERSION}`;
  (async () => {
    await byLoad(
      [
        { path: "/css/bootstrap.min.css", optional: false },
        { path: "/_transitions.min.css", optional: false }
      ],
      { host: HOST, defer: false }
    );
    await byLoad(
      [
        { path: "/js/jquery.min.js", optional: false },
        { path: "/_functions.min.js", optional: false },
        { path: "/_transitions.min.js", optional: false }
      ],
      { host: HOST }
    );
    // Initialize the application here.
  })().catch(console.error);
</script>
```

For early CSS, load the bootstrap script without `defer` and start stylesheets with `defer: false`. The JavaScript batch waits for CSS and DOM parsing.

Leading `/` paths use `host`; `./` and `../` stay document-relative, including `file://`. Absolute URLs and embedded CSS/JS data URLs work too. `before` places stylesheets relative to an existing head element. Entries accept `{ path, attributes }`; `{ path, optional: true }` warns and returns `null` on failure (for example, optional icon fonts). Required failures reject and stop the batch. Duplicate URLs share a request; failed URLs can be retried. Reimports retain the registry, and existing page event handlers are preserved.

### Page transitions

`_common.css` imports `_transitions.css` and `_fonts.css`; transitions can also load without the common theme or resets. Set `--transition-duration` on the root/container to override `0.3s`. Shared rules are defaults; resources own their overrides. Tooltips, popovers, and their contents have no animations/transitions by default. The reduced-motion block is commented out for each resource to enable or override its duration; `no-motion` still disables shared motion.

Load `_transitions.js` for native container height/opacity animations, without jQuery or Promise wrappers:

```js
byTransition(
  "#results",
  (element) => {
    element.replaceChildren(...results);
  },
  { duration: 200, children: false }
);

const watcher = byTransition.watch("#notifications", { children: true, exclude: ".preview" });
// Existing code can now update the container normally.
watcher.disconnect(); // Before removing or replacing the watched container.
```

`byTransition()` accepts a selector for current containers or an element, runs updates synchronously once per match (even with motion off), and returns its native animations. `watch()` coalesces child/text mutations and owns animations when the helper updates the same container. Default `children: false` animates only the selected container and watches direct content; `children: true` also animates direct children and watches descendants. The update callback still runs once per container. Resource-owned `exclude` selectors omit matching elements and descendants from animation and observation. Watchers do not observe attributes, discover later containers, or replace nodes. Disconnect before attaching another watcher to the same container. `duration` is non-negative milliseconds; omitted timing uses `--transition-duration`, with `ease` easing.

### Optional Google Fonts

`_fonts.js` loads fonts natively with caching and offline fallbacks. Pickers also need jQuery, Select2, `_common.css`, and `data-font-picker` controls:

```html
<script src="./spa.js/_fonts.js" defer></script>
<input name="fontFamily" data-font-picker value="Inter" />
```

UI text uses bundled Archivo; explicit selections and accessibility fonts remain available. API/helper JSDoc records parameters, defaults, returns, and lifecycle constraints; obvious callbacks need no repetition.

`byFont.family(value, fallback)` returns a CSS stack; `await byFont.ready(value, weight, text)` waits before measurement. Use `byFont.init(container)` / `byFont.destroy(container)` for dynamic fields, or `byFont.picker(field, { weight, previewText, fallback })` for one control. `weight` can be a control.

`byCommon.init()` enhances marked fields; navigation/modal cleanup disposes them. Reinitialization preserves widgets; missing optional libraries leave ordinary controls usable. Applications own font values and persistence.

### Fragment scripts and error pages

Fragments and translations are trusted application content; sanitize untrusted input. Ordered external/inline scripts, `defer`, and modules retain source order and attributes; explicit external `async` scripts run independently. Failures log and continue; stale fragments stop. `bySPA:load` waits for ordered page/component scripts. Sequencing uses `async`/`await`; public requests retain jQuery promises.

Error pages replace the document; Back reloads a clean runtime, even while their scripts load. Set `bySPA.ERROR_PATH` before `_spa.js` to override the first candidate. Defaults try `HOME_PATH/_error.html`, `HOME_PATH/spa.js/_error.html`, then `HOME_PATH/../_error.html`; exhaustion stops without recursion.

## Maintaining a submodule integration

Keep `_load.js`, `_transitions.css`, `_transitions.js`, `_fonts.css`, `_fonts.js`, `_functions.js`, `_common.js`, and `_common.css` identical across both SPAs; SPA.php owns the shared source. `_spa.js`, routing, transport, history, and application bootstrap retain host-specific behavior.

For upgrades, review changes, reconcile application-owned `_init.js`/`_routes.js` without losing settings, and run framework/consumer checks. Submodule updates do not update copied initializers; neither repository synchronizes the other automatically.

### Checks

```bash
node --test __tests__/runtime.test.js __tests__/common.test.js __tests__/fragment_scripts.test.js __tests__/parity.test.js __tests__/fonts.test.js
node --test __tests__/browser.test.js __tests__/fonts.browser.test.js __tests__/load.browser.test.js __tests__/transitions.browser.test.js
```

Browser tests require Playwright and Chromium; see [CI](.github/workflows/ci.yml). Use `PLAYWRIGHT_CHANNEL=chrome` for runtime tests and `BROWSER_CHANNEL=chrome` for font tests.

`SPA_PHP_TREE` selects a Git object store for pinned `_functions.js`/`_common.js` comparisons; other runtime files stay local. [parity-source.js](__tests__/parity-source.js) defines the reviewed revision, ignoring that checkout's working tree and HEAD. Selected parity checks do not establish complete runtime equivalence.

## Related tools

[easy-md-viewer](https://github.com/byuwur/easy-md-viewer) · [easy-json-viewer](https://github.com/byuwur/easy-json-viewer) · [easy-http-error](https://github.com/byuwur/easy-http-error) · [easy-sidebar-bootstrap](https://github.com/byuwur/easy-sidebar-bootstrap)

## Contributing

Follow [CODING_STANDARDS.md](CODING_STANDARDS.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE.md) · Copyright (c) Andrés Trujillo [Mateus] byUwUr

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/byuwur/spa.js)
