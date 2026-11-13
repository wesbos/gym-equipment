import React from "react";
import ReactDOM from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { installWebMCP } from "@w3c/webmcp-polyfill";
import { modelContext } from "./webmcp/model-context.ts";
import { routeTree } from "./pages/routes.tsx";
import "./base.css";
// Some browser integrations still supply the older navigator registry.
if (!modelContext()) installWebMCP();
const router = createRouter({ routeTree });
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
