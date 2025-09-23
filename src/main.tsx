import { render } from "preact";
import "./index.css";
import { App } from "./app.tsx";

// biome-ignore lint/style/noNonNullAssertion: preact being preact.
render(<App />, document.getElementById("app")!);
