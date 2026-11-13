const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const SPA_PHP_REVISION = "e899d4fec55e8a596120118f4d83344983f3d368";
const reference = process.env.SPA_PHP_TREE;

function source(file) {
  if (reference && ["_functions.js", "_common.js"].includes(file)) {
    const tree = path.resolve(reference).replace(/\\/g, "/");
    // The checkout supplies Git objects only; its HEAD and working files are not inputs.
    return execFileSync("git", ["-c", `safe.directory=${tree}`, "-C", tree, "show", `${SPA_PHP_REVISION}:${file}`], { encoding: "utf8" });
  }
  return fs.readFileSync(path.join(__dirname, "..", file), "utf8");
}

module.exports = { source, SPA_PHP_REVISION };
