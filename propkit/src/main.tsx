import "../../fig.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";

const bootstrap = async () => {
  await import("../../fig.js");
  createRoot(document.getElementById("app")!).render(<App />);
};

bootstrap();
