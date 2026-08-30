import { serveSite } from "../../src/server";

export default async function serve(args: string[]) {
  const sitePath = args[0] ?? "./example-site";
  await serveSite(sitePath);
}
