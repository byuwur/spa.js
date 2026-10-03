# byuwur/spa.js

A small framework for static single-page applications. Plain JavaScript and jQuery load HTML pages and shared components without a full refresh.

Try it at [byuwur.github.io/spa.js](https://byuwur.github.io/spa.js). Need PHP routes and server-side helpers? Use [spa.php](https://github.com/byuwur/spa.php).

## What does it do?

- Loads pages and components from a JavaScript route table.
- Uses hash routes by default, without server rewrites.
- Provides request, storage, modal, and error-page helpers.
- Loads JSON translations for text, trusted HTML, tooltips, labels, images, and localized routes.
- Reinitializes optional Bootstrap UI after navigation.

## Installation

You need jQuery, the core framework scripts, and an HTTP(S) server. Current evergreen browsers are supported. Bootstrap and other libraries are needed only for the features you use.

```bash
git clone https://github.com/byuwur/spa.js.git
```

Serve the checkout and open `demo/`. The repository root redirects there. Opening `demo/index.html` as `file://` shows a fallback notice: browsers cannot reliably load fragments that way.

## Usage

1. Start with the demo shell and copy `_init.js` into your application's root.
2. Define routes in the application's `_routes.js`.
3. Load helpers, application initialization, optional language support, routes, router, then SPA runtime, in that order.
4. Add HTML pages and point routes and components at them.
5. Serve the folder with a static server. No frontend package install or build step is required.

Static fragments use GET. `DATA` supplies route request data; `POST` remains a legacy alias, with `DATA` winning duplicate keys.

### Migration [v14]

`_var.js` became `_init.js`. Rename the application's copy and update script references. There is no compatibility alias.

### Languages

`_lang.js` chooses the language from `?lang=`, route queries, the `lang` cookie, `localStorage.APP_LANG`, browser language, then `es`. It persists the choice and updates `<html lang>`.

Set `byCommon.LANG_PATH` if dictionaries are elsewhere. The demo uses `/lang` relative to its own `HOME_PATH`. Use dotted keys such as `nav.home` or `accessibility.open_panel`.

## How is it done?

The **application root** owns the shell, initialization, routes, and configuration. The **framework root** holds reusable code, normally as a `spa.js/` submodule.

```text
application-root/
|-- index.html      # Application shell
|-- _init.js        # Application initialization
|-- _routes.js      # Application route table
`-- spa.js/         # Framework checkout or submodule
```

These are required by the default setup. Copy `_init.js` into the application root: its script URL and document determine paths, environment, routing mode, and storage. Loading the framework copy directly uses the wrong application context. Define routes before `_router.js` runs.

Each independently routed SPA needs its own initializer and route table. Hash routing needs no rewrites; path routing needs the host to serve `index.html` for non-file routes. The demo uses its parent directory as the framework root; regular consumers keep the full checkout at `spa.js/`.

### Framework files

| File                  | Purpose                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| `_functions.js`       | JSON, URL, request, WebSocket, cookie, modal, and form helpers.                                      |
| `_common.js`          | Shared UI, sidebar, accessibility, Bootstrap, tooltip, consent, particles, and video initialization. |
| `_init.js`            | Template for the application's paths, environment, routing, storage, and runtime setup.              |
| `_lang.js`            | Optional language selection, JSON dictionaries, `data-i18n`, and Google Translate callback.          |
| `_router.js`          | Initial hash/path routing, route data, and direct file routes.                                       |
| `_spa.js`             | Navigation, history, fragment/component requests, and page lifecycle.                                |
| `_common.css`         | Shared loader, sidebar, accessibility, and interface styles.                                         |
| `_error.html`         | Standalone static error page.                                                                        |
| `css/`, `js/`, `img/` | Bundled libraries and shared interface assets.                                                       |

Pages, components, `lang/`, and application assets belong to the consuming application. `demo/` includes its own shell, initializer, routes, sidebar, dictionaries, flags, sample PDF, and video. Images used by shared CSS stay in the framework's `img/` directory.

Root `index.html` is a redirect, not the application shell. `.nojekyll` is only needed for GitHub Pages publishing.

### Bundled libraries

Libraries are included in `css/` and `js/` and loaded from local paths. The intention is to avoid depending on CDNs or external resources for these assets. Load only the libraries your application uses.

- **Interface:** Bootstrap, Popper, jQuery, jQuery UI, and Shards UI.
- **Forms:** Select2, Pickr, and Dropzone.
- **Media:** Swiper and Video.js.
- **Animation:** Animate.css, Typed.js, particles.js, GSAP, and MorphSVGPlugin.
- **Consent:** Cookie Consent (`js/cookies.min.js`).
- **Icons and fonts:** Font Awesome with local webfonts, Archivo, Bahnschrift, and OpenDyslexic in `css/webfonts/`.

Keeping these files local gives you control over updates and availability. Update the bundled copies when needed; optional integrations that call external services still need those services.

## Runtime contracts

### Routes and navigation

- `bySPA.VERSION` identifies the framework; `bySPA.APP_VERSION` identifies your application.
- Route-defined values override `/$/` path parameters, which override query parameters. `DATA` overrides duplicate legacy `POST` keys from the initial route onward.
- Invalid explicit initial URLs fail normally; saved routes or cached tables cannot replace them. An absent route resolves to `/`.
- Only the first `?` separates path and query. Literal and encoded question marks survive initial and later routing. Route objects keep the last duplicate value; `get_url_param` returns the first and prefers document queries over hash queries.
- Navigation emits `bySPA:before-unload`, then `bySPA:load` on success or `bySPA:error` on failure. The timeout is 30 seconds (`bySPA.REQUEST_TIMEOUT`).
- Unknown routes emit one status-404 error before the standalone error page; exhausted fallbacks add no second terminal event. Details are `{ navigationId, url, status, error }`; status `0` means no transport status.
- Superseded requests cannot change the newer DOM or loader or emit terminal events. Initial routing follows the same rules. FILE routes leave without a success event; unknown routes do not create a history entry.

`HOME_PATH` defines the application's origin and path boundary: `/app-two` is outside `/app`. Ordinary same-origin links inside it, or configured route paths outside it without a fragment, are SPA links. `_init.js` defines this boundary; there is no separate `ROUTE_BASE_PATH` setting.

`_spa.js` handles route clicks. `byCommon` scrolls only existing same-document IDs. Other fragments stay native, including external and sibling-document anchors. Modified/middle clicks, downloads, non-`_self` targets, prevented events, and `custom-folder="true"` are not intercepted.

### Storage and shared UI

Storage keys use the finalized application root as a namespace. Successful migration removes legacy keys. Consent reads `APP_THEME` and `APP_LANG` through `byStorage`, defaulting to `dark` and `es`.

A failed write keeps only that key's local value until a successful explicit write or removal. A failed removal keeps a local null marker, including when legacy cleanup fails. Unaffected keys still read persistent storage. There is no background replay or cross-tab reconciliation; memory fallback lasts for the current runtime only. Update application-owned initializer copies to adopt changes to this behavior.

`_spa.js` calls `byCommon.init()` after content changes. Keep shared UI setup there instead of duplicating route hooks. Optional initialization diagnostics are off by default; enable `byCommon.INIT_WARNINGS` or pass `{ showWarn: true }`. Required-runtime errors still appear.

### Fragment scripts and error pages

Trusted page/component scripts execute as real script elements. Inline and non-async external scripts keep their order; `defer` fragments and non-async modules are awaited too. External `async` scripts run independently. Attributes, including CSP/SRI and data attributes, are preserved.

External script failures are logged without failing navigation or stopping later scripts. Superseded fragments stop processing. `bySPA:load` waits for the current page and components' ordered scripts.

Error pages replace the full document and use the same script rules. History navigation away reloads the application with a clean runtime.

Set `bySPA.ERROR_PATH` before `_spa.js` to try a custom error fragment first. Fallback order is `HOME_PATH/_error.html`, `HOME_PATH/spa.js/_error.html`, then `HOME_PATH/../_error.html`. Exhausting the list stops loading without recursive error handling. The demo uses the parent fallback.

HTML fragments and translation strings are trusted application content. Sanitize untrusted input before it reaches them.

`byCommon.accessibilityText("plus")` and `byCommon.accessibilityText("minus")` change body text size by `0.25rem`, within `0.5rem` to `3rem`. Calling it without a mode resets text to `1rem`.

## Maintaining a submodule integration

Framework changes belong here. Consumers pin a commit and record their upgrades separately. Neither SPA repository automatically updates the other.

1. Review the old and new immutable framework commits and affected shared behavior.
2. Reconcile application-owned `_init.js` and `_routes.js`, preserving settings. A submodule update does not update copied initialization.
3. Run the framework's [CI checks](.github/workflows/ci.yml), including browser tests.
4. Compare shared helpers against a reviewed SPA.php revision and record intentional differences.
5. Test initial routing, error/Back/FILE navigation, and storage failure/recovery in the consumer.

### Shared contracts and copied initializers

| Files                   | Shared behavior / difference                                                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_functions.js`         | SPA.php query parsing and request-listener behavior; comments and local names may differ.                                                                                    |
| `_common.js`            | Consent and ordinary-click handling. SPA.js accepts explicit `_self`; SPA.php leaves all explicit targets native.                                                            |
| `_spa.js`, `_router.js` | Query, failure, and superseded-request rules; static GET, hash/path routing, error candidates, and history remain host-specific.                                             |
| `_init.js`              | Application-owned copy template. Reconcile consumer and demo copies for storage fallback, failed removals, migration, and explicit recovery. PHP bootstrap remains separate. |

Whole runtime files do not need to be byte-identical.

### Checks

```bash
node --test tests/runtime.test.js tests/common.test.js tests/fragment_scripts.test.js tests/parity.test.js
node --test tests/browser.test.js
```

Browser checks need Playwright and its browser; use the installation in the [CI workflow](.github/workflows/ci.yml). `PLAYWRIGHT_CHANNEL=msedge` can select a local Edge installation.

<details>
<summary>Comparison revisions and upgrade follow-ups</summary>

The SPA.php reference is `e899d4fec55e8a596120118f4d83344983f3d368`; the reviewed SPA.js behavior baseline is `55c2ecb1f4b3b7e25df69ccef6f4f1179a8527a9`. These are comparison references, not automatic dependency updates.

CI uses this checkout without fetching another repository. Set `SPA_PHP_TREE` to a local SPA.php Git object store to run parity and browser checks against the pinned helpers. In PowerShell, use `$env:SPA_PHP_TREE = 'C:/path/to/spa.php'`, then `Remove-Item Env:SPA_PHP_TREE` afterward.

Only `_functions.js` and `_common.js` come from that immutable reference; routing, storage, and other runtime files stay local. Changing it requires reviewing `SPA_PHP_REVISION` in `tests/parity-source.js` and this record. The working tree and moving HEAD are ignored. Helper tests do not prove full runtime equivalence; browser tests also cover the demo's actual initializer.

SPA.php's comparison still names SPA.js `8a3df8aca9e92b5dcfa32f495f9ce005ccbbfb69`; review that pin and rerun shared checks against the closure revision. Review synchronous lifecycle-listener guards separately. Stream.FGC must review its own framework pin, reconcile `frontend/_init.js`, preserve its settings, and run integration tests.

</details>

## Related tools

- [easy-md-viewer](https://github.com/byuwur/easy-md-viewer): Readable, themed Markdown with rich formatting and zero dependencies.
- [easy-json-viewer](https://github.com/byuwur/easy-json-viewer): Explore large JSON documents with collapsible trees and responsive rendering.
- [easy-http-error](https://github.com/byuwur/easy-http-error): Friendly bilingual error pages that work even when PHP fails.
- [easy-sidebar-bootstrap](https://github.com/byuwur/easy-sidebar-bootstrap): Responsive Bootstrap navigation that remembers your sidebar preferences.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and [CODING_STANDARDS.md](CODING_STANDARDS.md) for engineering standards.

## License

MIT (c) Andrés Trujillo [Mateus] byUwUr
