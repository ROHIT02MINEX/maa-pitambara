/** `tailwindcss-animate` ships no type declarations of its own. */
declare module "tailwindcss-animate" {
  import type { PluginCreator } from "tailwindcss/types/config";
  const plugin: PluginCreator | { handler: PluginCreator };
  export default plugin;
}
