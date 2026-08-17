# Institute artwork

Put the institute's own logo file here:

```
public/brand/institute-logo.png
```

It is used by `components/brand/institute-logo.tsx`, which renders it in the
site header, the sidebar, the sign-in panel, the landing hero and the result
page. Replacing the file updates every one of those at once.

**Requirements**

- PNG (or WebP), square, at least 512x512. The landing hero renders it at
  320 px, so anything smaller will look soft.
- A transparent or white background. The seal sits on a warm off-white page in
  light mode and on deep navy in dark mode, so a transparent background looks
  best in both.

Until the file exists the app falls back to `InstituteMark`, a small drawn
version of the crest, so nothing appears broken. The browser tab icon is
separate and lives in `app/icon.svg`.
