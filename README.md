# byuwur/spa.js

**byUwUr's Easy JS SPA**

~ SPA made easy, with love, and JS. ~

Looking for a more robust light SPA micro-framework with PHP? Check out [byuwur/spa.php](https://github.com/byuwur/spa.php)

Test it out at: [byuwur.co/spa.php/](https://byuwur.co/spa.php/)

## What's this about?

This project is a simple, easy-to-use framework for building single-page applications (SPAs) using vanilla JS. Since this is vanilla JS, this SPA is thought for static sites. It provides a structure for handling routing, static page fragments, reusable components, modals, and basic operations required for an SPA. The framework is designed to be lightweight and easy to integrate into existing projects.

**[NEW!]** Try use this repository as a git submodule: See how it's used at [github.com/byuwur/stream.fgc](https://github.com/byuwur/stream.fgc/tree/main/frontend/dist). Easier than a package, because sometimes you don't need a package.

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

### Core Files [in priority order]

- **\_functions.js:** Contains standalone helpers used across different parts of the application.
- **\_common.js:** Optional Bootstrap/jQuery preset that initializes common UI elements.
- **\_var.js:** Defines runtime variables and project-level SPA settings.
- **\_lang.js:** Owns language state, JSON dictionaries, `data-i18n` hydration, and the optional Google Translate callback.
- **\_routes.js:** Defines the route table and shared components.
- **\_router.js:** Merges `_var.js`, `_lang.js`, and `_routes.js`, then prepares runtime route config.
- **\_spa.js:** Contains the main JavaScript functions for managing the SPA's frontend logic.
- **index.html:** Static entry point that loads the shell, assets, routes, and router.

### Additional Files

- **\_common.css:** Optional CSS file that styles common UI elements.
- **\_error.html:** File rendered when SPA throws an error.
- **lang/**: Contains static JSON language dictionaries.

### Public Assets

- **css/**: Contains all style files. (This project uses Bootstrap 5.3)
- **js/**: Contains optional script files. (The example uses Bootstrap 5.3 and jQuery)
- **img/**: Contains all image resources.
- **\*.html**: Static route fragments can live at the root or wherever `_routes.js` points.
- **components/**: Contains reusable static component fragments.

## Installation

1. Clone the repository to your local machine.
2. That'd be it!

## Usage

1. Define your routes in the `_routes.js` file.
2. Use the routing system to manage your SPA's navigation.
3. Add custom functionality by creating new HTML files and adding them to the routes.
4. Serve the folder with any static server and navigate. Suit yourself.

> Opening `index.html` directly as `file://` only shows a fallback notice. Browsers block AJAX requests from `file://`, so route fragments such as `main.example.html` and components such as `sidebar.html` need a local/static server (`http://localhost/...`) to load correctly.

> `_lang.js` chooses the current language from `?lang=`, route query values, the `lang` cookie, `localStorage.APP_LANG`, the browser language, then the default (`es`). It stores the selected value back into the cookie/localStorage and updates the `<html lang="">` attribute.

> Language files live in `lang/{code}.json`. Prefer dotted keys such as `nav.home`, `accessibility.open_panel`, and `demo.home.description` so page/feature ownership stays obvious. Use `data-i18n` for text content, `data-i18n-html` for trusted HTML snippets, `data-i18n-title` for `title`/Bootstrap tooltip titles, `data-i18n-label` for `aria-label`, `data-i18n-alt` for image alt text, and `data-i18n-route` when a link route should come from the loaded JSON.

> `_spa.js` calls `byCommon.init()` after dynamic content is swapped. Keep reusable Bootstrap, tooltip, sidebar, and accessibility setup behind that common initializer so projects can inherit behavior instead of duplicating route hooks.

> `_spa.js` uses `POST` for page/component requests by default to stay close to `spa.php`, but is now switched to `GET` for better compatibility with engines like Wails. You can turn back to `POST` if you're using a more traditional server like Apache.

## Some other things I've made and used here

- [easy-http-error](https://github.com/byuwur/easy-http-error) - Custom error page with server configurations.
- [easy-sidebar-bootstrap](https://github.com/byuwur/easy-sidebar-bootstrap) - Sidebar component using Bootstrap and jQuery.

## License

MIT (c) Andrés Trujillo [Mateus] byUwUr
