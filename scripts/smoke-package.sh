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
#
# Takes an optional node binary to import with, so the package can be packed by
# a modern toolchain and then loaded by the oldest Node the engines field
# promises - which is what a user on that Node actually does. It is resolved to
# an absolute path here, because the import runs after a cd into the throwaway
# project, where a relative path would point at nothing.
set -eu

repository=$(cd "$(dirname "$0")/.." && pwd)
importing=${1:-node}
smoke=$(mktemp -d)

case $importing in
  */*) importing=$(cd "$(dirname "$importing")" && pwd)/$(basename "$importing") ;;
esac

cleanup() { rm -rf "$smoke"; }
trap cleanup EXIT

npm --prefix "$repository" pack --pack-destination "$smoke" >/dev/null 2>&1

cd "$smoke"
printf '{"name":"smoke","type":"module","private":true}' >package.json
npm install ./ocelli-*.tgz "$repository/node_modules/@playwright/test" >/dev/null 2>&1

"$importing" --input-type=module -e '
const { default: Ocelli } = await import("ocelli")

if (typeof Ocelli !== "function") {
  throw new Error(`expected a reporter constructor, got ${typeof Ocelli}`)
}

new Ocelli({ screen: { isTTY: false, ttyWidth: 0, ttyHeight: 0,
  colors: { red: (t) => t }, stdout: { write: () => true } } })
'

echo "packed install loads and constructs on $("$importing" -v)"
