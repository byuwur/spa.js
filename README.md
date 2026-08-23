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
- **AJAX Support:** The core uses `fetch`; optional helper functions can use jQuery when your project includes it.
- **Custom Error Handling:** Set up static custom error pages for missing routes or failed fragment loads.

## How is it done?

### Framework/core files [in priority order]

- **\_functions.js:** Contains standalone helpers used across different parts of the application.
- **\_common.js:** Optional Bootstrap/jQuery preset that initializes common UI elements.
- **\_var.js:** Defines runtime variables and project-level SPA settings.
- **\_lang.js:** Owns language state, JSON dictionaries, `data-i18n` hydration, and the optional Google Translate callback.
- **\_router.js:** Combines the framework state with the application's route table and prepares runtime route config.
- **\_spa.js:** Contains the main JavaScript functions for managing the SPA's frontend logic.
- **\_common.css:** Optional shared styles.
- **\_error.html:** Shared static error page.
- **css/** and **js/**: Optional reusable vendor assets.
- **img/**: Assets required by shared code or retained for compatibility.

### Application configuration

- **\_var.js:** Application-owned runtime and path settings. The repository demo supplies `demo/_var.js`.
- **\_routes.js:** Application-owned route definitions. The repository demo supplies `demo/_routes.js`.
- **lang/**: Application-owned JSON dictionaries. The repository demo supplies `demo/lang/`.
- **index.html:** The application shell. The repository demo supplies `demo/index.html`; the root file is only a compatibility redirect.

### Demo

The runnable showcase is fully contained in `demo/`: its application variables, shell, routes, page fragments, sidebar, dictionaries, flags, sample PDF, and sample video. It owns `HOME_PATH` like a real consumer and loads reusable framework files from the parent directory, which takes the place a submodule folder would have in another repository. Visiting `https://byuwur.github.io/spa.js/` redirects to it while preserving the query string and hash route.

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
