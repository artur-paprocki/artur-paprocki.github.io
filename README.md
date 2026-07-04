# arturpaprocki.com

Personal essay site, built with [Eleventy](https://www.11ty.dev/).

## Stack

- [Eleventy](https://www.11ty.dev/) 3.x — static site generator
- [@11ty/eleventy-img](https://www.11ty.dev/docs/plugins/image/) — responsive image pipeline (AVIF/WebP/JPEG)
- [rough.js](https://roughjs.com/) — hand-drawn SVG strokes generated at build time
- Self-hosted fonts (Fraunces, Newsreader), no external font requests
- No front-end framework, no client-side build step

## Build

```
npm install
npm run build
```

Output goes to `_site/`.

## Develop

```
npm run serve
```

## Deploy

Static output (`_site/`) is deployed via GitHub Actions to GitHub Pages. CI/CD
configuration is added in a later phase.
