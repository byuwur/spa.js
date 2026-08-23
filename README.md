# byuwur/spa.js

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
|-- _var.js         # REQUIRED application path/environment configuration
|-- _routes.js      # REQUIRED application route table
`-- spa.js/         # REQUIRED framework checkout/submodule
```

- **index.html:** Loads the application shell and scripts in dependency order: framework helpers, the application `_var.js`, optional language support, the application `_routes.js`, then the framework router and SPA runtime.
- **\_var.js:** Must be owned by each independent SPA root because its own script URL establishes `HOME_PATH`, `TO_HOME`, the environment, and the routing mode. Do not replace it with `spa.js/_var.js`; use the framework file as the starting implementation for the application copy.
- **\_routes.js:** Must define the application's route table before `spa.js/_router.js` executes. Route fragments and components can live anywhere the table points.
- **spa.js/:** In a normal consumer, the framework directory must remain reachable by browser asset URLs at this application-root path. The repository demo references the parent directory instead because it already is the framework checkout. A normal Git submodule still checks out the full directory.

Hash routing needs no server rewrite. If an application selects path routing, its host must fall back to the application `index.html` for non-file routes.

### Framework/Core files [in priority order]

- **\_functions.js:** Provides the JSON, URL/path, HTTP, WebSocket, cookie, modal, form-request, and other standalone helpers used by the runtime and application scripts.
- **\_common.js:** Provides the default `byCommon` runtime used by `_spa.js` and initializes shared sidebar, accessibility, Bootstrap, tooltip, modal, cookie-consent, particle, and video behavior when those elements or libraries are present.
- **\_var.js:** Provides the starting implementation for the required application-owned `_var.js`, defining the paths and runtime settings consumed by the router and SPA loader.
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

The runnable showcase is fully contained in `demo/`: its application variables, shell, routes, page fragments, sidebar, dictionaries, flags, sample PDF, and sample video. It owns `HOME_PATH` like a real consumer and loads reusable framework files from the parent directory, which takes the place a submodule folder would have in another repository. Visiting `https://byuwur.github.io/spa.js/` redirects to it.

The root `img/icon-back.png`, `img/icon-fore.png`, and `img/byuwur.png` remain beside `_common.css` because shared CSS references them.

## Installation

1. Clone the repository to your local machine.
2. That'd be it!

## Usage

1. Keep application variables in your own `_var.js`.
2. Define your application's routes in its own `_routes.js`.
3. Use the routing system to manage your SPA's navigation.
4. Add custom functionality by creating new HTML files and adding them to the routes.
5. Serve the folder with any static server and navigate. Suit yourself.

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
