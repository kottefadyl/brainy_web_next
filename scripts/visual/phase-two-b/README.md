# Phase 2b visual review

This fixture uses production components with synthetic data and never contacts the data API. The login check loads the normal app; it does not sign in or mutate data. It is not an authenticated end-to-end test.

Run from `brainy_web_app` with Node 24 and Chrome installed:

1. `node scripts/visual/phase-two-b/check.mjs --prepare`
2. Start `npm run dev` on port 3001.
3. Launch a dedicated Chrome process with `--headless=new --disable-gpu --remote-debugging-port=9226 --user-data-dir=<absolute-path-to-brainy_web_app>/.phase-two-b-review-chrome about:blank`. On Windows, use `Start-Process -WindowStyle Hidden`.
4. `node scripts/visual/phase-two-b/check.mjs`
5. Inspect the screenshots and `metrics.json` in `.visual-checks/phase-two-b/`.
6. Stop the dev server and dedicated Chrome. Run `node scripts/visual/phase-two-b/check.mjs --cleanup` before a production build.

The checks assert 48 combinations of viewport (320, 390, 640, 1280), theme and view; contrast across 24 data format colors; readable chart axes; keyboard selection and typeahead; Escape within a modal; mobile drawer focus; reduced motion indicator placement; enlarged root text; independent scrolling. A 640 CSS px viewport also exercises reflow equivalent to a 1280 px viewport at 200% browser zoom; it does not change the browser zoom setting.

The blue navigation update also checks navigation text contrast and data format icon contrast. Each synthetic data format has six fields to exercise the compact preview and expandable field list.

The navigation and collection header use the same theme roles on both clients, with the user-selected deeper blue `#084BC4`. Run `node scripts/visual/phase-two-b/overlays.mjs` after step 4 for 12 combinations of width (320, 390, 1280), theme and language. It checks header and menu contrast, action hit targets outside card bounds, viewport edges, language selection, keyboard navigation, Escape, outside click and restored focus. Its screenshots and metrics are in `.visual-checks/collection-overlays/`.

The generated route is excluded from Git. Screenshots, metrics and browser profiles are excluded from Git, lint and TypeScript. Cleanup also retires the generated `.next/dev/types` cache, which otherwise keeps a validator importing the removed fixture route. No new dependencies are required. Do not run the development server concurrently with the final build.
