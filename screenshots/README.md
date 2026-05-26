# Screenshots

`main.png` is referenced from the project README. To regenerate it with
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
