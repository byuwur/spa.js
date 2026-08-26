# byuwur/spa.js

SPA.js is a static SPA micro-framework: a plain-JavaScript runtime using jQuery for AJAX and DOM integration.

## Runtime contracts

jQuery and the core framework scripts are hard runtime dependencies. Bootstrap and bundled plugin integrations are optional unless used by the application. Current evergreen browsers served over HTTP(S) are supported; `file://` cannot reliably load fragments.

`bySPA.VERSION` is the framework/runtime version and can be read with `console.log(bySPA.VERSION)`. `bySPA.APP_VERSION` remains the consuming application's version.

Route data precedence is fixed: route-defined values override `/$/` path parameters, which override ordinary query parameters. Use `DATA` for static route request data from the initial route onward. `POST` remains a compatible legacy alias, `DATA` overrides duplicate `POST` keys, and static fragment requests are GET requests without PHP-style POST semantics.

Route state is namespaced from the finalized application root and falls back to memory when browser storage is unavailable; successfully migrated legacy values are removed so they cannot reappear later.

Navigation emits `bySPA:before-unload`, then `bySPA:load` on success or `bySPA:error` on failure. Older slow responses are ignored. `bySPA.REQUEST_TIMEOUT` defaults to 30 seconds. Same-origin links are intercepted only when they belong to the application path or identify a configured route; `custom-folder="true"` remains the explicit opt-out.

`byCommon` initialization is quiet by default. Set `byCommon.INIT_WARNINGS = true` to enable optional sidebar, Bootstrap, captcha, cookie-consent, and particles diagnostics, or pass `{ showWarn: true }` for one call. Required-runtime errors and warnings outside that initialization chain remain visible.

Scripts in trusted route and component fragments execute as real browser `<script>` elements. Inline scripts and non-`async` external scripts keep source order; `defer` external scripts are treated as ordered fragment dependencies because dynamic fragments have no document-parser defer phase. Non-`async` module scripts are also awaited. Explicit external `async` scripts start independently and do not delay later fragment scripts or `bySPA:load`. Attributes, including CSP/SRI and data attributes, are preserved. External load failures are logged but do not fail navigation or stop later scripts; stale navigation stops the old fragment before it can continue. `bySPA:load` fires only after the current route and component fragments finish processing their ordered scripts.

Error pages intentionally replace the full document rather than rendering inside the SPA shell. Their scripts use the same ordered execution rules; history navigation away triggers a full reload so the application starts with a clean runtime.

`ERROR_PATH` is retained as an optional override for deployments, including the repository demo, whose error fragment is outside the application root. Without it, conventional application and framework error-fragment paths are tried.

HTML fragments and translation strings are trusted application content and must be sanitized if they contain untrusted input.

**byUwUr's Easy JS SPA**

~ SPA made easy, with love, and JS. ~

Looking for a more robust light SPA micro-framework with PHP? Check out [byuwur/spa.php](https://github.com/byuwur/spa.php)

Test it out at: [byuwur.github.io/spa.js](https://byuwur.github.io/spa.js)

## What's this about?

This project is a simple, easy-to-use framework for building single-page applications (SPAs) using vanilla JS. Since this is vanilla JS, this SPA is thought for static sites. It provides a structure for handling routing, static page fragments, reusable components, modals, and basic operations required for an SPA. The framework is designed to be lightweight and easy to integrate into existing projects.

**[NEW!]** Try use this repository as a git submodule: See how it's used at [github.com/byuwur/stream.fgc](https://github.com/byuwur/stream.fgc/). Easier than a package, because sometimes you don't need a package.

## What does it do?

- **Client-Side Routing:** Use a JS route table to load static HTML pages and components.
- **Compatible:** Add everything you want on top of it. It's meant to be flexible for you.
- **Static Friendly:** Works with hash routes by default, so small static hosts do not need rewrite rules.
- **Component Loading:** Load shared static fragments such as sidebars, navs, and footers.
- **Static Language Files:** Load language dictionaries from JSON files without a backend.
- **Bootstrap Integration:** Use the included optional helpers to reinitialize Bootstrap UI after each route load.
- **Accessible i18n Attributes:** Translate visible text, trusted HTML, tooltips, aria labels, alt text, and localized routes from the same JSON files.
- **AJAX Support:** The SPA runtime uses jQuery AJAX to load routed fragments and components without a full page refresh.
- **Custom Error Handling:** Set up static custom error pages for missing routes or failed fragment loads.

## How is it done?

### What "SPA root" means

- The **application root** is the public directory that owns one independently routed SPA, such as `stream.fgc/frontend/` or this repository's `demo/` directory.
- The **framework root** is the `spa.js/` checkout or submodule consumed by that application. It normally lives at `application-root/spa.js/`; the repository demo uses the parent directory as the equivalent framework root. Reusable files stay there and are referenced from the application.

The old `(root)` and `(main)` labels mixed location with responsibility. The distinction used here is **application-owned** versus **framework-owned**, followed by whether the file is required by the default setup.

### REQUIRED at each application root

The default static SPA layout requires:

```text
application-root/
|-- index.html      # REQUIRED application shell
|-- _init.js        # REQUIRED application-specific SPA initialization
|-- _routes.js      # REQUIRED application route table
`-- spa.js/         # REQUIRED framework checkout/submodule
```

- **index.html:** Loads the application shell and scripts in dependency order: framework helpers, the application `_init.js`, optional language support, the application `_routes.js`, then the framework router and SPA runtime.
- **\_init.js:** Copy this application-specific initialization file into each SPA root. Its own script URL and consuming document establish `HOME_PATH`, `TO_HOME`, the environment, routing mode, and namespaced storage. Loading `spa.js/_init.js` directly would make application context depend on the framework directory instead of the consuming static application.
- **\_routes.js:** Must define the application's route table before `spa.js/_router.js` executes. Route fragments and components can live anywhere the table points.
- **spa.js/:** In a normal consumer, the framework directory must remain reachable by browser asset URLs at this application-root path. The repository demo references the parent directory instead because it already is the framework checkout. A normal Git submodule still checks out the full directory.

Framework files are reusable implementation; `_init.js` and `_routes.js` are application-owned copies/configuration. If a project has multiple independent SPA roots, each root needs its own `_init.js` and route table because initialization belongs to that entry-point context.

Hash routing needs no server rewrite. If an application selects path routing, its host must fall back to the application `index.html` for non-file routes.

### Framework/Core files [in priority order]

- **\_functions.js:** Provides the JSON, URL/path, HTTP, WebSocket, cookie, modal, form-request, and other standalone helpers used by the runtime and application scripts.
- **\_common.js:** Provides the default `byCommon` runtime used by `_spa.js` and initializes shared sidebar, accessibility, Bootstrap, tooltip, modal, cookie-consent, particle, and video behavior when those elements or libraries are present.
- **\_init.js:** Provides the starting implementation to copy as the required application-owned `_init.js`; it initializes paths, environment values, routing mode, namespaced storage, and runtime state before routes, the router, and the SPA loader.
- **\_lang.js:** Optionally owns language selection and persistence, JSON dictionary loading, `data-i18n` hydration after route changes, and the Google Translate callback.
- **\_router.js:** Reads the application route table, normalizes the initial hash or path URI, merges route parameters, handles direct file routes, and prepares the state consumed by `_spa.js`.
- **\_spa.js:** Handles browser history, SPA link interception, routed fragment/component requests, content replacement, error loading, and the lifecycle run after dynamic content is inserted.
- **\_common.css:** Provides the shared loader, sidebar, accessibility, and interface styles used by the default shell.
- **\_error.html:** Provides the default static error page loaded when a route, fragment, or component request fails.
- **css/** and **js/**: Reusable vendor assets used by the demo and available to applications. `_spa.js` requires jQuery, while Bootstrap and the other libraries are required only by the helpers or UI an application enables.
- **img/**: Contains loader and interface assets referenced by `_common.css`, plus assets retained at framework-root paths for compatibility.

### Application-owned optional files

- **lang/**: JSON dictionaries required when the application loads `_lang.js`. The repository demo supplies `demo/lang/`.
- **Route fragments and components:** Required only when referenced by `_routes.js`; the demo supplies its pages and sidebar under `demo/`.
- **Application CSS, JavaScript, and images:** Required only when referenced by the application shell or its routed content.

### Repository compatibility files

- **index.html:** Redirects requests made to the deployed repository root into `demo/`. It is not the application shell consumers should copy.
- **.nojekyll:** Keeps GitHub Pages from processing the static framework and demo files through Jekyll; it is not required on other static hosts.

### Demo

The runnable showcase is fully contained in `demo/`: its application initialization, shell, routes, page fragments, sidebar, dictionaries, flags, sample PDF, and sample video. It owns `HOME_PATH` like a real consumer and loads reusable framework files from the parent directory, which takes the place a submodule folder would have in another repository. Visiting `https://byuwur.github.io/spa.js/` redirects to it.

The root `img/icon-back.png`, `img/icon-fore.png`, and `img/byuwur.png` remain beside `_common.css` because shared CSS references them.

## Installation

1. Clone the repository to your local machine.
2. That'd be it!

## Usage

1. Copy `_init.js` into the application root and keep that application-specific initialization there.
2. Define your application's routes in its own `_routes.js`.
3. Use the routing system to manage your SPA's navigation.
4. Add custom functionality by creating new HTML files and adding them to the routes.
5. Serve the folder with any static server and navigate. Suit yourself.

### Migration [v14]

`_var.js` was renamed to `_init.js`. Existing applications must rename their copied file and update every script reference from `_var.js` to `_init.js`; no compatibility alias is provided.

> Opening `demo/index.html` directly as `file://` only shows a fallback notice. Browsers block AJAX requests from `file://`, so demo route fragments and components need a local/static server (`http://localhost/...`) to load correctly.

> `_lang.js` chooses the current language from `?lang=`, route query values, the `lang` cookie, `localStorage.APP_LANG`, the browser language, then the default (`es`). It stores the selected value back into the cookie/localStorage and updates the `<html lang="">` attribute.

> Set `byCommon.LANG_PATH` when dictionaries do not live at the application root. The demo uses the default `/lang` path relative to its own `HOME_PATH`. Prefer dotted keys such as `nav.home`, `accessibility.open_panel`, and `demo.home.description`.

> `_spa.js` calls `byCommon.init()` after dynamic content is swapped. Keep reusable Bootstrap, tooltip, sidebar, and accessibility setup behind that common initializer so projects can inherit behavior instead of duplicating route hooks.

> `_spa.js` uses `POST` for page/component requests by default to stay close to `spa.php`, but is now switched to `GET` for better compatibility with engines like Wails. You can turn back to `POST` if you're using a more traditional server like Apache.

## Some other things I've made and used here

- [easy-http-error](https://github.com/byuwur/easy-http-error) - Custom error page with server configurations.
- [easy-sidebar-bootstrap](https://github.com/byuwur/easy-sidebar-bootstrap) - Sidebar component using Bootstrap and jQuery.

## License

MIT (c) Andrés Trujillo [Mateus] byUwUr
