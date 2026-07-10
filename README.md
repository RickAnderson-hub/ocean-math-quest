# Ocean Math Quest

A times-table flashcard game for practicing multiplication (2× through 12×), themed as an ocean dive. Mastery-gated progression, no ads, no accounts — all progress is saved locally in the browser.

## Develop

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

Produces a static site in `dist/`.

## Deploy

The build output in `dist/` is a fully static site (relative asset paths, no server needed). Two easy options:

- **Netlify:** drag the `dist/` folder onto https://app.netlify.com/drop
- **GitHub Pages:** push `dist/` to a `gh-pages` branch, or serve it from the repo's Pages settings pointed at `dist/`

To preview the production build locally first:
```bash
npm run build
npx serve dist
```

## Progress data

 All progress lives in the browser's `localStorage`, scoped to this site's origin. Use the gear icon (Parent Corner) to export or import progress as a JSON file — handy for moving progress to a new device or backing it up before clearing browser data.
