import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toasty } from "@cloudflare/kumo";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("root missing");

createRoot(root).render(
  <StrictMode>
    <Toasty>
      <App />
    </Toasty>
  </StrictMode>,
);
