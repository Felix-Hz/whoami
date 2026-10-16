import type { ComponentType } from "preact";
import type { BlogPost } from "@/types/blog";

// Dev-only authoring UI plugs in here. main.tsx imports src/authoring only when
// import.meta.env.DEV is true, so in production builds these stay undefined and
// none of the authoring code is bundled.
export const authoringSlot: {
  Toolbar?: ComponentType<{ url: string }>;
  Badge?: ComponentType<{ post: BlogPost }>;
} = {};
