import React from "react";
import ReactDOM from "react-dom/client";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  Link,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router";
import UprightPage from "./pages/UprightPage.tsx";
import PartsPage from "./pages/PartsPage.tsx";
import LibraryPage from "./pages/LibraryPage.tsx";
import "./base.css";
const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <main>
      <h1>Page not found</h1>
      <Link to="/builder">Open rack builder</Link>
    </main>
  ),
});
const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/builder.html",
    beforeLoad: () => {
      throw redirect({ to: "/builder" });
    },
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/parts.html",
    beforeLoad: () => {
      throw redirect({ to: "/parts" });
    },
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/index.html",
    beforeLoad: () => {
      throw redirect({ to: "/" });
    },
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: UprightPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/builder",
    component: lazyRouteComponent(() => import("./pages/BuilderPage.tsx")),
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/parts",
    component: PartsPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/library",
    component: LibraryPage,
  }),
]);
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
