import { hydrate, render } from "preact";
import "./index.css";
import { App } from "./app.tsx";

// Statically false in production builds, so the authoring code is never bundled
if (import.meta.env.DEV) await import("./authoring");

// biome-ignore lint/style/noNonNullAssertion: preact being preact.
const root = document.getElementById("app")!;
const mount = root.childNodes.length > 0 ? hydrate : render;
mount(<App />, root);

console.log("%cim just like you, nerd", "color: #32cd32; font-size: 24px; font-family: monospace;");
