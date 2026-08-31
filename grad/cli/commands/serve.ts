// grad/cli/commands/serve.ts

import { serveSite } from "../../src/server";

export default async function serve(args: string[]) {
  const sitePath = args[0] ?? "./website";
  await serveSite(sitePath);
}
