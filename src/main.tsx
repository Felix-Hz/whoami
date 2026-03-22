import { render } from "preact";
import "./index.css";
import { App } from "./app.tsx";

// biome-ignore lint/style/noNonNullAssertion: preact being preact.
render(<App />, document.getElementById("app")!);

console.log("%c> you're curious. i like that.", "color: #4a7c59; font-size: 14px; font-family: monospace;");
