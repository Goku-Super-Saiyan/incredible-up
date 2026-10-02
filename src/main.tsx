import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { inject } from "@vercel/analytics";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Visitor numbers for the Analytics tab in Vercel (same-site script, no cookies).
inject();
