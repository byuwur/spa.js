# byuwur/spa.js

A static single-page application framework with jQuery page/component loading, hash or path routing, translations, shared UI, and utility helpers.

![SPA.js demo preview](prev.jpg)

## Index

1. [Quick start](#quick-start)
2. [Try it](#try-it)
3. [Downloads](#downloads)
4. [Application layout](#application-layout)
5. [Navigation](#navigation)
6. [Runtime helpers](#runtime-helpers)
7. [Maintenance](#maintenance)
8. [Related projects](#related-projects)
9. [License](#license)

## Quick start

Requires jQuery, HTTP(S), and a current browser. Optional features need their bundled libraries; no frontend install or build is needed.

```bash
git clone https://github.com/byuwur/spa.js.git
```

Serve the checkout and open `demo/`; the root redirects there. AJAX fragments cannot reliably load over `file://`, which shows a fallback notice.

The [demo](demo/) is a working application. Copy its shell, initializer and route table into your own application.

## Try it

[Demo](https://byuwur.github.io/spa.js) · [Local demo](demo/)

## Downloads

[Regular ZIP](https://github.com/byuwur/spa.js/releases/latest/download/spa.js.zip) · [Minified ZIP](https://github.com/byuwur/spa.js/releases/latest/download/spa.js.minified.zip) · [Bundled ZIP](https://github.com/byuwur/spa.js/releases/latest/download/spa.js.bundled.zip) · [Complete ZIP [EXPERIMENTAL]](https://github.com/byuwur/spa.js/releases/latest/download/spa.js.complete.zip). Filenames stay the same across releases; `manifest.json` records the version and source commit.

| Edition                     | Contents                                            |
| --------------------------- | --------------------------------------------------- |
| Regular ZIP                 | Authored framework and `demo/`.                     |
| Minified ZIP                | Minified authored JS/CSS and `demo/`.               |
| Bundled ZIP                 | Core JS/CSS bundles and `demo/`.                    |
| Complete ZIP [EXPERIMENTAL] | One reusable framework file and a separate `demo/`. |

Bundled builds need jQuery, optional UI dependencies, and the accompanying asset folders. Complete builds embed shipped libraries, CSS, fonts and framework error handling. The application still owns its pages, routes, dictionaries, credentials and external services.

### Complete browser framework [EXPERIMENTAL]

`spa.complete.js` is the reusable framework; the HTML application remains in `demo/`. Keep your own initializer, routes, pages, dictionaries, and media in that application folder:

```html
<script src="./_init.js" defer></script>
<script src="./_routes.js" defer></script>
<script src="../spa.complete.js" defer></script>
```

The bundle embeds fonts and images as data URLs and propagates a script nonce to its style block. Serve AJAX pages over HTTP(S).

## Application layout

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

## Navigation

- Fragments use GET. Route values override `/$/` parameters, which override queries; `DATA` overrides the legacy `POST` alias from initial routing onward.
- Missing explicit initial routes fail normally; saved routes cannot replace them. An absent route resolves to `/`. Only the first `?` separates path/query. Route objects keep the last duplicate value; `get_url_param()` keeps the first and prefers document queries over hash queries.
- Navigation emits `bySPA:before-unload`, then one `bySPA:load` or `bySPA:error`. Error details are `{ navigationId, url, status, error }`; status `0` means no transport status. `bySPA.REQUEST_TIMEOUT` defaults to 30 seconds.
- Superseded work cannot update the newer DOM/loader or emit a terminal event, including when lifecycle listeners start another navigation. Unknown routes report one 404 without adding history; exhausted error fallbacks add no second error. FILE routes leave without a load event.
- `HOME_PATH` owns the origin/path boundary. Ordinary same-origin links inside it, or configured fragment-free paths outside it, route through `_spa.js`. Modified/middle clicks, downloads, non-`_self` targets, prevented events, and `custom-folder="true"` stay native. `byCommon` scrolls existing same-document IDs; other ordinary fragments remain native.
- `bySPA.VERSION` identifies the framework; `bySPA.APP_VERSION` identifies the application.

Fragments and translations are trusted application content; sanitize untrusted input. Ordered external/inline scripts, `defer`, and modules retain source order and attributes; explicit external `async` scripts run independently. Failures log and continue; stale fragments stop. `bySPA:load` waits for ordered page/component scripts. Sequencing uses `async`/`await`; public requests retain jQuery promises.

Error pages replace the document; Back reloads a clean runtime, even while their scripts load. Set `bySPA.ERROR_PATH` before `_spa.js` to override the first candidate. Defaults try `HOME_PATH/_error.html`, `HOME_PATH/spa.js/_error.html`, then `HOME_PATH/../_error.html`; exhaustion stops without recursion.

## Runtime helpers

1. [Storage and shared UI](#storage-and-shared-ui)
2. [Compressed URL data](#compressed-url-data)
3. [Ordered assets](#ordered-assets)
4. [Page transitions](#page-transitions)
5. [Optional Google Fonts](#optional-google-fonts)

### Storage and shared UI

`byStorage` scopes keys to the application root and migrates legacy keys. A failed write or removal falls back in memory for that key until an explicit change succeeds. Consent defaults to dark mode and Spanish. Reimporting helpers preserves storage and active navigation.

Navigation calls `byCommon.init()` for new content. Call it yourself on standalone pages. Use `byCommon.INIT_WARNINGS` or `{ showWarn: true }` for diagnostics. `initSelect2Keyboard()` enables keyboard selection; `initBootstrap({ tooltipsOnly: true, root, refreshTooltips: true })` refreshes scoped tooltips. Single-select arrows commit the highlighted item and keep the list open; multi-selects require confirmation. Modal cleanup disposes controls owned by the closing element.

Load `_privacy.js` in the website shell. After the body is ready, call `const controls = byCommon.initPrivacyControls({ policyURL, cookiesURL, message, onChoice })`. The host applies `"yes"` or `"no"` in `onChoice` and calls `controls.update(true, savedChoice)` to reflect its stored preference. Call `controls.update(false)` on excluded routes. Omitting `onChoice` previews the UI in the current tab. Close dismisses the banner for 180 days without changing consent. Use `data-privacy-inline="on-load"` on a page fragment to show the banner once per visit even with a saved choice. Accept, Reject and Close dismiss it for that visit. The banner follows the host theme or system appearance. A fixed-theme host can pass an explicit `theme` of `light` or `dark`. By default dismissal is stored on the origin. Hosts can pass `dismissalDomain` to share dismissal through a secure first-party domain cookie. Open the banner with `byCommon.openPrivacyControls()`, `<a href="#privacy-controls">Privacy settings</a>`, or `<button type="button" data-target="#cookie-controls">Cookie settings</button>`. Both fragments also work in direct links.

`byCommon.accessibilityText("plus" | "minus")` changes the root font in 0.25rem steps from 0.5rem to 3rem. Call it without arguments to reset to 1rem. Data, escaping, CSRF and WebSocket transport run natively. UI and form helpers use jQuery, and modals need Bootstrap.

Place `<div data-privacy-inline></div>` on the privacy page to display the same controls in the page flow, including the current choice. Other pages show the compact cookie banner until the visitor chooses or dismisses it. Link to the privacy page or `#cookie-controls` from your site's navigation so visitors can change their choice later.

### Compressed URL data

`compress_url_data(text)` and `decompress_url_data(token, maxBytes = 1048576)` return native Promises and use raw DEFLATE with unpadded Base64url, without jQuery or SPA initialization.

```js
const token = await compress_url_data(JSON.stringify(settings));
const restored = JSON.parse(await decompress_url_data(token));
```

Requires native `CompressionStream`/`DecompressionStream` support for `deflate-raw`. Decompression rejects malformed data/UTF-8 and output above the positive safe-integer UTF-8 byte limit. Callers own JSON, validation, URL parameters, and format markers.

### Ordered assets

Load [\_load.js](_load.js) before calling `byLoad()`. It loads CSS and classic scripts in array order. Await required assets before initializing the app.

```html
<script src="https://cdn.jsdelivr.net/gh/byuwur/spa.js@v20.15/_load.min.js"></script>
<script>
  const host = "https://cdn.jsdelivr.net/gh/byuwur/spa.js@v20.15";
  byLoad(["/css/bootstrap.min.css", "/js/jquery.min.js"], { host, defer: false }).catch(console.error);
</script>
```

`defer` defaults to true and waits for DOM parsing. Use false for early CSS. A leading slash uses `host`; relative paths resolve against the document. Absolute and data URLs also work. Use `before` to position styles, and `{ path, attributes, optional }` for individual files. Optional failures resolve to `null`; required failures reject. Duplicate URLs share their request, and failed loads can be retried.

### Page transitions

`_common.css` imports the font and transition stylesheets. Override `--transition-duration` (default 0.3s) or use `no-motion`. [\_transitions.js](_transitions.js) supplies `byTransition(target, update, options)` and `byTransition.watch(target, options)`. Updates run once per matched container even with motion disabled. `children` includes direct children and observes descendants; `exclude` omits matching subtrees. Disconnect watchers before replacing their container.

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

### Optional Google Fonts

[\_fonts.js](_fonts.js) caches fonts and falls back offline. Use `byFont.family(value, fallback)` for the CSS stack and await `byFont.ready(value, weight, text)` before measuring. For pickers, load jQuery, Select2 and `_common.css`, then mark fields with `data-font-picker`. `byFont.init(container)` and `byFont.destroy(container)` manage dynamic fields; `byFont.picker(field, options)` targets one field. The host owns persistence.

## Maintenance

Keep `_load.js`, `_transitions.css`, `_transitions.js`, `_fonts.css`, `_fonts.js`, `_functions.js`, `_privacy.js`, `_common.js`, and `_common.css` identical across both SPAs; SPA.php owns the shared source. `_spa.js`, routing, transport, history, and application bootstrap retain host-specific behavior.

For upgrades, review changes, reconcile application-owned `_init.js`/`_routes.js` without losing settings, and run framework/consumer checks. Submodule updates do not update copied initializers; neither repository synchronizes the other automatically.

### Checks

```sh
node --test __tests__/runtime.test.js __tests__/common.test.js __tests__/fragment_scripts.test.js __tests__/fonts.test.js
node --test __tests__/browser.test.js __tests__/load.browser.test.js __tests__/transitions.browser.test.js
```

Set `NODE_PATH` to your installed Playwright modules. [CI](.github/workflows/ci.yml) runs Chromium, Firefox and WebKit by default. Select **extended** to also check cross-project parity.

### Local preview

Use Node.js 22+. From the repository root:

```sh
npm --prefix .github ci --ignore-scripts --no-audit --no-fund
node .github/scripts/build.mjs --tag v0.0.0-local
node .github/node_modules/playwright/cli.js install chromium
npm --prefix .github run release:test
```

Review `dist/RELEASE_NOTES.md` and `dist/assets/`. Use `--offline` for local minification. The [release workflow](.github/workflows/release.yml) checks the archives and publishes on a version tag. The manifest records sources and hashes.

## Related projects

[PHP version: SPA.php](https://github.com/byuwur/spa.php) · [MD.view](https://github.com/byuwur/md.view) · [JSON.view](https://github.com/byuwur/json.view) · [easy-http-error](https://github.com/byuwur/easy-http-error) · [easy-sidebar-bootstrap](https://github.com/byuwur/easy-sidebar-bootstrap)

Follow [CODING_STANDARDS.md](CODING_STANDARDS.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE.md) · Copyright (c) Andrés Trujillo [Mateus] byUwUr
