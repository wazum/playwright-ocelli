#!/bin/sh
# Packs the tarball, installs it into a throwaway project and loads it.
#
# Node refuses to strip TypeScript inside node_modules
# (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING), so shipping .ts sources as the
# entry point installs fine and then fails at import. Only a real install
# proves the package is loadable.
#
# The build is left to the prepack lifecycle rather than run here, so this
# takes the same path npm publish takes. Building first would hide a missing
# prepack, which is exactly how a tarball with no dist/ got published-shaped.
set -eu

repository=$(cd "$(dirname "$0")/.." && pwd)
smoke=$(mktemp -d)

cleanup() { rm -rf "$smoke"; }
trap cleanup EXIT

npm --prefix "$repository" pack --pack-destination "$smoke" >/dev/null 2>&1

cd "$smoke"
printf '{"name":"smoke","type":"module","private":true}' >package.json
npm install ./ocelli-*.tgz "$repository/node_modules/@playwright/test" >/dev/null 2>&1

node --input-type=module -e '
const { default: Ocelli } = await import("ocelli")

if (typeof Ocelli !== "function") {
  throw new Error(`expected a reporter constructor, got ${typeof Ocelli}`)
}

new Ocelli({ screen: { isTTY: false, ttyWidth: 0, ttyHeight: 0,
  colors: { red: (t) => t }, stdout: { write: () => true } } })
'

echo "packed install loads and constructs"
