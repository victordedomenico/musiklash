export { alt, contentType, default, size } from "./opengraph-image";

// Node runtime + on-demand (see opengraph-image): seo.ts loads the
// node-only ContentSource adapter, incompatible with edge runtime.
export const dynamic = "force-dynamic";
