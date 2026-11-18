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
<script src="https://cdn.jsdelivr.net/gh/byuwur/spa.js@v20.13/_load.min.js"></script>
<script>
  const SPA_VERSION = "v20.13";
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

Routine CI keeps small runtime/storage/navigation, safe-helper, ordered-loading, font-fallback, and lifecycle checks. Detailed widget, style, option, and catalog tests have been removed. New tests must protect a core contract or a real regression; host UI checks stay smaller than the distributed runtime checks.

```sh
node --test __tests__/runtime.test.js __tests__/common.test.js __tests__/fragment_scripts.test.js __tests__/fonts.test.js
node --test __tests__/browser.test.js __tests__/load.browser.test.js __tests__/transitions.browser.test.js
```

Install Playwright outside the repository and set `NODE_PATH` to its `node_modules`. `PLAYWRIGHT_CHANNEL=chrome` and `BROWSER_CHANNEL=chrome` select installed Chrome for the respective existing suites. CI uses a matching browser image instead of installing operating-system/browser packages in every job. Chromium, Firefox, and WebKit have separate jobs linked in that order. The small browser cases have 30-second limits, test steps two minutes, and jobs three minutes; superseded runs are canceled. A failed pass remains visible and does not hide the later engine results. `BROWSER_ENGINE` selects an engine locally.

Reviewed cross-project parity is the only optional suite; run `node --test __tests__/parity.test.js` or enable **extended** in [CI](.github/workflows/ci.yml).

`SPA_PHP_TREE` selects a Git object store for pinned `_functions.js`/`_common.js` comparisons; other runtime files stay local. [parity-source.js](__tests__/parity-source.js) defines the reviewed revision, ignoring that checkout's working tree and HEAD. Selected parity checks do not establish complete runtime equivalence.

## Related tools

[MD.view](https://github.com/byuwur/md.view) · [JSON.view](https://github.com/byuwur/json.view) · [easy-http-error](https://github.com/byuwur/easy-http-error) · [easy-sidebar-bootstrap](https://github.com/byuwur/easy-sidebar-bootstrap)

## Releases

[Regular ZIP](https://github.com/byuwur/spa.js/releases/latest/download/spa.js.zip) · [Minified ZIP](https://github.com/byuwur/spa.js/releases/latest/download/spa.js.minified.zip) · [Bundled ZIP](https://github.com/byuwur/spa.js/releases/latest/download/spa.js.bundled.zip) · [Complete ZIP [EXPERIMENTAL]](https://github.com/byuwur/spa.js/releases/latest/download/spa.js.complete.zip). Filenames stay the same across releases; `manifest.json` records the version and source commit.

[Release workflow](.github/workflows/release.yml) builds a reviewable preview on pushes to `main`, pull requests, and manual runs. Only a pushed version tag publishes a GitHub release. Source/browser checks and the complete distribution build must succeed on both main and tag runs before publication. Failed builds remove their own temporary stage and retain the last completed output. Two-part tags such as `v1.8` and three-part tags such as `v1.8.1` are supported. Keep release tags consistent with the project's source version.

| Edition                     | Contents                                            |
| --------------------------- | --------------------------------------------------- |
| Regular ZIP                 | Authored framework and `demo/`.                     |
| Minified ZIP                | Minified authored JS/CSS and `demo/`.               |
| Bundled ZIP                 | Core JS/CSS bundles and `demo/`.                    |
| Complete ZIP [EXPERIMENTAL] | One reusable framework file and a separate `demo/`. |

`spa.bundle.js` and `spa.bundle.css` are reusable core bundles. Keep the ZIP's library/font/image folders and load jQuery plus any optional UI dependencies before the JS bundle. Application initialization and routes load before the bundle. The complete edition includes every shipped browser library in dependency order and embeds CSS, fonts, CSS images, and error-page support. It retains original license notices. Missing jQuery UI icon sheets were restored from the stylesheet's matching upstream 1.14.2 release.

### Complete browser framework [EXPERIMENTAL]

`spa.complete.js` is the reusable framework; the HTML application remains in `demo/`. Keep your own initializer, routes, pages, dictionaries, and media in that application folder:

```html
<script src="./_init.js" defer></script>
<script src="./_routes.js" defer></script>
<script src="../spa.complete.js" defer></script>
```

JavaScript stays JavaScript; it is not Base64-encoded. Fonts/images use embedded data URLs. The file creates one style block and preserves a script nonce on that block when supplied. The framework's error document is embedded as text. AJAX pages still require HTTP(S); `file://` retains the existing fallback notice.

Application pages, translations, media, credentials, Composer dependencies, live services, and dynamically requested Google Fonts remain application-owned. The bundled demo's Easy viewer examples and live integrations still require internet. The complete edition does not turn arbitrary applications or remote services into offline pages.

Minification prefers jsDelivr-generated files pinned to the exact source commit when local source matches that commit. Unavailable CDN files and local edits use pinned esbuild instead. `--offline` selects local minification. `manifest.json` records providers, hashes, edition inventories, and complete-edition adapters. Prettier formats generated HTML demos while minified assets remain minified.

### Local preview

Requires Node.js 22 or newer; packaging/test dependencies are private to `.github`. Run from the repository root. In PowerShell, use `npm.cmd` if execution policy blocks `npm`.

```sh
npm --prefix .github ci --ignore-scripts --no-audit --no-fund
node .github/scripts/build.mjs --tag v0.0.0-local
node .github/node_modules/playwright/cli.js install chromium
npm --prefix .github run release:test
```

Open `dist/RELEASE_NOTES.md` for the generated notes and `dist/assets/` for the complete tested output. Download `tested-release` from the workflow run to review CI results. Local commands and manual runs do not publish.

### Script responsibilities

- [release.json](.github/release.json) owns the repository identity, package inventory, and download explanations.
- [build.mjs](.github/scripts/build.mjs) builds runtime ZIPs in a temporary output directory, then writes notes, provenance, and checksums.
- [editions.mjs](.github/scripts/editions.mjs) generates core bundles, the complete browser framework, and separate demo imports.
- [release.mjs](.github/scripts/release.mjs) reads the real Git history. `--check` validates the exact pushed tag on `main`; `--publish` verifies the tested output and creates or resumes its matching draft before publishing.
- [release tests](.github/tests/release.mjs) verify checksums, ZIP inventories, and the distributed runtime by running the existing checks against both extracted ZIPs. Internal-function source fixtures run on the regular ZIP; browser checks, including ordered fragment scripts, run on both variants. [Publication tests](.github/tests/publish-release.mjs) use a mock GitHub API to verify interrupted uploads, draft ownership, corruption rejection, and reruns.

[Edition checks](.github/tests/editions.mjs) exercise both generated editions from an isolated application, the supplied demo, real navigation, offline framework libraries/fonts/images, and error rendering. PHP checks also cover read-only archive use and denial of source/configuration requests.

The workflow uses read-only access while building/testing, passes the exact tested output to a separate publication job, and grants write access only there. Published releases are never overwritten. A failed upload leaves a draft that the same tested build can resume. Tag pushes and live release publication are separate from local validation.

## Contributing

Follow [CODING_STANDARDS.md](CODING_STANDARDS.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE.md) · Copyright (c) Andrés Trujillo [Mateus] byUwUr

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/byuwur/spa.js)
