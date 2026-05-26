#!/bin/sh
# seed-screenshot.sh — populate a throwaway AYA_HOME with fake projects so
# you can grab a clean screenshot without leaking real project names or
# directory paths.
#
# Usage:
#   ./scripts/seed-screenshot.sh
#   AYA_HOME=/tmp/aya-demo AYA_DEV=1 npm run dev    # then take screenshot
#   rm -rf /tmp/aya-demo                            # cleanup
#
# All fake project directories are also created under /tmp/aya-demo-projects
# so aya doesn't trip the "directory not found" modal.

set -e

HOME_DIR="${AYA_HOME:-/tmp/aya-demo}"
PROJECTS_ROOT="/tmp/aya-demo-projects"

rm -rf "$HOME_DIR" "$PROJECTS_ROOT"
mkdir -p "$HOME_DIR/projects" "$PROJECTS_ROOT"

# Create three fake project directories so cwd validation passes.
for name in armillary atlas-api portfolio-site; do
  mkdir -p "$PROJECTS_ROOT/$name"
  # A token .git directory so the status bar shows a branch.
  git init -q -b main "$PROJECTS_ROOT/$name"
  (cd "$PROJECTS_ROOT/$name" && \
    touch README.md && \
    git -c user.email=demo@aya.dev -c user.name=demo add README.md && \
    git -c user.email=demo@aya.dev -c user.name=demo commit -q -m "init")
done

# Project configs — names + paths the user is fine showing publicly.
cat > "$HOME_DIR/projects/armillary.json" <<EOF
{
  "name": "armillary",
  "directory": "$PROJECTS_ROOT/armillary",
  "tabs": [
    { "id": "demo-c1", "presetId": "claude", "name": "claude" },
    { "id": "demo-s1", "presetId": "shell", "name": "pytest" }
  ]
}
EOF

cat > "$HOME_DIR/projects/atlas-api.json" <<EOF
{
  "name": "atlas-api",
  "directory": "$PROJECTS_ROOT/atlas-api",
  "tabs": [
    { "id": "demo-x1", "presetId": "codex", "name": "codex" }
  ]
}
EOF

cat > "$HOME_DIR/projects/portfolio-site.json" <<EOF
{
  "name": "portfolio-site",
  "directory": "$PROJECTS_ROOT/portfolio-site",
  "tabs": [
    { "id": "demo-s2", "presetId": "shell", "name": "vite dev" }
  ]
}
EOF

# Display order matches the design's mockup.
cat > "$HOME_DIR/projects-order.json" <<'EOF'
["armillary", "atlas-api", "portfolio-site"]
EOF

# Seed presets so the launcher row is populated without an async PATH scan.
cat > "$HOME_DIR/presets.json" <<'EOF'
{
  "presets": [
    { "id": "claude", "name": "Claude Code", "icon": "✻", "color": "#d97757", "command": "claude" },
    { "id": "codex",  "name": "Codex",       "icon": "◆", "color": "#10a37f", "command": "codex" },
    { "id": "shell",  "name": "Shell",       "icon": "$", "color": "",         "command": "$SHELL" }
  ]
}
EOF

cat <<EOF

Seeded:
  $HOME_DIR
    presets.json           (claude / codex / shell)
    projects/*.json        (armillary, atlas-api, portfolio-site)
    projects-order.json    (display order)
  $PROJECTS_ROOT
    armillary/             (initialized git repo)
    atlas-api/             (initialized git repo)
    portfolio-site/        (initialized git repo)

Launch aya pointing at this home:
  AYA_HOME=$HOME_DIR AYA_DEV=1 npm run dev

Cleanup when done:
  rm -rf $HOME_DIR $PROJECTS_ROOT

EOF
