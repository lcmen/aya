# Screenshots

`hero.png` is the image referenced from the project README. It is a
vertical stack of `main.png` (the workspace) above `snippets-drawer.png`
(the snippets drawer open). Both shots share the same width, so stacking
needs no padding. Built with:

```sh
magick main.png snippets-drawer.png -append hero.png
```

To regenerate the source shots `main.png` / `snippets-drawer.png` with
mocked data (no real project names or paths from your machine):

```sh
./scripts/seed-screenshot.sh
AYA_HOME=/tmp/aya-demo AYA_DEV=1 npm run dev
# take the screenshot once the window is up, save as screenshots/main.png
# then:
rm -rf /tmp/aya-demo /tmp/aya-demo-projects
```

The seed script populates `/tmp/aya-demo` with the design's three demo
projects (armillary / atlas-api / portfolio-site), each backed by a real
git repo under `/tmp/aya-demo-projects/<name>` so the status bar shows a
clean branch.
