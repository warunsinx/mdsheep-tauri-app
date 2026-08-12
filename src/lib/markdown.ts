import { defaultSchema } from "hast-util-sanitize";
import type { Options } from "rehype-sanitize";

export const markdownSanitizeSchema: Options = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-[\w-]+$/]],
    pre: [...(defaultSchema.attributes?.pre ?? []), "className"],
    input: [...(defaultSchema.attributes?.input ?? []), ["type", "checkbox"], "checked", "disabled"],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
};
