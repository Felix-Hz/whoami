import { hydrate, render } from "preact";
import "./index.css";
import { App } from "./app.tsx";

// biome-ignore lint/style/noNonNullAssertion: preact being preact.
const root = document.getElementById("app")!;
const mount = root.childNodes.length > 0 ? hydrate : render;
mount(<App />, root);

console.log("%c> you're curious. i like that.", "color: #4a7c59; font-size: 14px; font-family: monospace;");
