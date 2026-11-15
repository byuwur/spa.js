# byuwur/spa.js

![SPA.js demo preview](prev.jpg)

A static single-page application framework with jQuery page/component loading, hash or path routing, translations, shared UI, and utility helpers.

[Demo](https://byuwur.github.io/spa.js) · [PHP version: SPA.php](https://github.com/byuwur/spa.php)

## Installation

Requires jQuery, an HTTP(S) server, and a current browser. Optional features need their bundled libraries; no frontend install or build is required.

```bash
git clone https://github.com/byuwur/spa.js.git
```

Serve the checkout and open `demo/`; the root redirects there. `file://` cannot reliably load AJAX fragments and displays a fallback notice.

## How is it done?

The application owns its shell, initializer, routes, pages, components, dictionaries, and assets. The framework normally lives in a submodule:

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

The initializer's script URL determines application paths and storage; loading the framework copy directly uses the wrong context. Hash routing needs no rewrites; path routing must serve `index.html` for non-file routes. The demo uses its parent as the framework root.

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

Load only the libraries you use; remote integrations still require their services. Shared CSS images stay in the framework's `img/`. `.nojekyll` supports GitHub Pages publishing.

Since v14, `_var.js` is `_init.js`; update old imports. No compatibility alias exists.

### Languages

`byCommon.getLanguage()` reads the active language; `bySPA.setLanguage(lang)` and `byCommon.setLanguage(lang)` update it. The getter does not load dictionaries or write preferences.

`_lang.js` chooses language from document `?lang=`, route queries, cookie, `localStorage.APP_LANG`, browser language, then `es`; it persists the choice and updates `<html lang>`. Dictionaries use dotted keys such as `nav.home`. Set `byCommon.LANG_PATH` to override their location; the demo uses application-relative `/lang`.

## Runtime contracts

### Routes and navigation

- Fragments use GET. Route values override `/$/` parameters, which override queries; `DATA` overrides the legacy `POST` alias from initial routing onward.
- Missing explicit initial routes fail normally; saved routes cannot replace them. An absent route resolves to `/`. Only the first `?` separates path/query. Route objects keep the last duplicate value; `get_url_param()` keeps the first and prefers document queries over hash queries.
- Navigation emits `bySPA:before-unload`, then one `bySPA:load` or `bySPA:error`. Error details are `{ navigationId, url, status, error }`; status `0` means no transport status. `bySPA.REQUEST_TIMEOUT` defaults to 30 seconds.
- Superseded work cannot update the newer DOM/loader or emit a terminal event, including when lifecycle listeners start another navigation. Unknown routes report one 404 without adding history; exhausted error fallbacks add no second error. FILE routes leave without a load event.
- `HOME_PATH` owns the origin/path boundary. Ordinary same-origin links inside it, or configured fragment-free paths outside it, route through `_spa.js`. Modified/middle clicks, downloads, non-`_self` targets, prevented events, and `custom-folder="true"` stay native. `byCommon` scrolls existing same-document IDs; other ordinary fragments remain native.
- `bySPA.VERSION` identifies the framework; `bySPA.APP_VERSION` identifies the application.

### Storage and shared UI

Each installed API owns one boolean `initialized` flag. Bootstrap scripts can populate the shared namespace before `_spa.js` sets `bySPA.initialized = true`. Repeated imports preserve storage fallback values and active navigation; ordinary `byCommon.init()` calls still initialize new page content.

`byStorage` namespaces keys by application root and removes legacy keys after migration. Failed writes/removals give only that key a local value/null marker until a successful explicit change; other keys keep reading persistent storage. Memory fallback lasts for this runtime, without automatic replay or cross-tab synchronization. Consent reads namespaced `APP_THEME`/`APP_LANG`, defaulting to `dark`/`es`.

`_spa.js` calls `byCommon.init()` after content changes. Optional warnings are off; enable `byCommon.INIT_WARNINGS` or `{ showWarn: true }`. `byCommon.initBootstrap({ tooltipsOnly: true, root, refreshTooltips: true })` refreshes scoped tooltips without rerunning other components.

Modal cleanup destroys optional font controls and removes the captured element, preserving replacements with the same ID. `byCommon.accessibilityText(mode)` adjusts root size by `0.25rem` for `"plus"`/`"minus"`, within `0.5rem`-`3rem`; no argument resets `1rem`.

Data, HTML-text escaping, and CSRF utilities are native. UI and HTTP/form helpers use jQuery; modals also need Bootstrap. WebSocket transport is native, with jQuery DOM logging.

### Compressed URL data

`compress_url_data(text)` and `decompress_url_data(token, maxBytes = 1048576)` use native raw DEFLATE, unpadded Base64url, and Promises without jQuery or SPA initialization.

```js
const token = await compress_url_data(JSON.stringify(settings));
const restored = JSON.parse(await decompress_url_data(token));
```

Requires native `CompressionStream`/`DecompressionStream` support for `deflate-raw`. Decompression rejects malformed data/UTF-8 and output exceeding the positive safe-integer UTF-8 byte limit. Callers own JSON, validation, URL parameters, and format markers.

### Ordered assets

`_load.js` exposes native `byLoad(files, { host, before, defer })` without jQuery. The default `defer: true` waits for DOM parsing. Set `defer: false` to start a batch immediately, including while the head is being parsed. CSS and classic JavaScript paths keep their array order; the promise resolves after loading. Await it before application initialization. Dynamically inserted scripts do not delay `DOMContentLoaded`.

```html
<script src="https://cdn.jsdelivr.net/gh/byuwur/spa.js@v20.11/_load.min.js"></script>
<script>
  const SPA_VERSION = "v20.11";
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

For CSS-first startup, load the bootstrap script without `defer` and start the stylesheets with `defer: false`. The JavaScript batch waits for those stylesheets and DOM parsing.

Leading `/` paths use `host`; `./` and `../` paths remain document-relative, including `file://`. Absolute and embedded CSS/JS data URLs also work. Pass `before` to preserve stylesheet cascade order relative to an existing head element. Entries can be `{ path, attributes }`; `{ path, optional: true }` warns and returns `null` on failure, for optional assets such as icon fonts. Required failures reject and stop the batch. Duplicate URLs share a request; failures can be retried, and repeated loader imports retain that registry. Existing page event handlers are preserved.

### Page transitions

`_common.css` imports `_transitions.css` alongside `_fonts.css`. The transition stylesheet can also load on its own, without the common theme or element resets. Set `--transition-duration` on the root or a container to change its default `0.3s`. Shared rules are generic defaults; each resource owns its component overrides. Tooltips and popovers, including their contents, have no animations or transitions by default. The reduced-motion media block is provided commented out; each resource can enable it or override the duration. The `no-motion` class still disables shared motion.

Load `_transitions.js` to update selected containers with native height/opacity animations. It has no jQuery dependency and adds no Promise wrappers:

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

Selectors match the current containers; an element is also accepted. Update callbacks run synchronously for each match, even when motion is disabled. `byTransition()` returns the native animations it started. `watch()` observes child/text changes, coalesces each mutation batch, and owns the animation when the same container is updated through the helper. With `children: false` (the default), only the selected container is animated and direct content changes are watched. `children: true` also animates its direct children and watches descendant changes. The update callback still runs once per selected container. `exclude` is an optional CSS selector owned by the resource; matching elements and their descendants are not animated or watched. It does not observe attributes, discover later containers, or replace nodes itself. Disconnect a watcher before attaching another to the same container. `duration` is non-negative milliseconds; omitted timing comes from `--transition-duration`, and easing defaults to `ease`.

### Optional Google Fonts

`_fonts.js` loads fonts natively with caching and offline fallbacks. Optional pickers need jQuery, Select2, `_common.css`, and `data-font-picker` controls:

```html
<script src="./spa.js/_fonts.js" defer></script>
<input name="fontFamily" data-font-picker value="Inter" />
```

Shared interface text uses the bundled Archivo font; explicit selections and accessibility fonts remain available. Reusable utility/API JSDoc records accepted parameters, defaults, return values, and lifecycle constraints; obvious callbacks do not need it.

`byFont.family(value, fallback)` returns a CSS stack; `await byFont.ready(value, weight, text)` returns readiness before measurement. Use `byFont.init(container)` / `byFont.destroy(container)` for dynamic fields, or `byFont.picker(field, { weight, previewText, fallback })` for one control; `weight` can be a control.

`byCommon.init()` enhances marked fields; navigation/modal cleanup disposes them. Repeated initialization preserves widgets; absent optional libraries leave ordinary controls usable. Applications own font values and persistence.

### Fragment scripts and error pages

Fragments and translations are trusted application content; sanitize untrusted input. Ordered external/inline scripts, `defer`, and modules preserve source order and attributes; explicit external `async` scripts run independently. Failures log and continue; stale fragments stop. `bySPA:load` waits for ordered page/component scripts. Sequencing uses `async`/`await`; public requests retain jQuery promises.

Error pages replace the full document; Back reloads a clean runtime, including while their scripts load. Set `bySPA.ERROR_PATH` before `_spa.js` to override the first candidate. Defaults try `HOME_PATH/_error.html`, `HOME_PATH/spa.js/_error.html`, then `HOME_PATH/../_error.html`; exhaustion stops without recursion.

## Maintaining a submodule integration

Keep `_load.js`, `_transitions.css`, `_transitions.js`, `_fonts.css`, `_fonts.js`, `_functions.js`, `_common.js`, and `_common.css` identical across both SPAs; SPA.php owns the shared source. `_spa.js`, routing, transport, history, and application bootstrap retain host-specific behavior.

For upgrades, review changes, reconcile application-owned `_init.js`/`_routes.js` without losing settings, run checks, and test the consumer. Submodule updates do not update copied initializers. Neither repository synchronizes the other automatically.

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
