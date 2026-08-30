import build from "./commands/build";
import serve from "./commands/serve";
import create from "./commands/new";
import version from "./commands/version";
import help from "./commands/help";

const args = process.argv.slice(2);

const command = args[0];

// first non-flag argument after command = sitePath
const sitePath =
  args.slice(1).find(a => !a.startsWith("--")) ?? "./example-site";

const flags = args.filter(a => a.startsWith("--"));

const commands: Record<string, Function> = {
  build,
  serve,
  new: create,
  version,
  help,
};

if (!command || !commands[command]) {
  help();
  process.exit(0);
}

// IMPORTANT: always pass sitePath first
await commands[command]([sitePath, ...flags]);
