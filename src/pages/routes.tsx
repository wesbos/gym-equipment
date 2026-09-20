import {
  createRootRoute,
  createRoute,
  Outlet,
  Link,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router";
/** Pages load lazily so the route table stays importable (and testable) without their CSS or workers. */
const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <main>
      <h1>Page not found</h1>
      <Link to="/">Open rack builder</Link>
    </main>
  ),
});
export const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/builder.html",
    beforeLoad: () => {
      throw redirect({ to: "/", replace: true });
    },
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/parts.html",
    beforeLoad: () => {
      throw redirect({ to: "/library", replace: true });
    },
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/index.html",
    beforeLoad: () => {
      throw redirect({ to: "/", replace: true });
    },
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: lazyRouteComponent(() => import("./BuilderPage.tsx")),
  }),
  // Permanent alias for old bookmarks and e2e specs; search params survive the hop.
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/builder",
    beforeLoad: ({ search }) => {
      throw redirect({ to: "/", search, replace: true });
    },
  }),
  // The library gallery is the part picker; a bare /parts has nothing to show.
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/parts",
    beforeLoad: () => {
      throw redirect({ to: "/library", replace: true });
    },
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/parts/$partId",
    component: lazyRouteComponent(() => import("./PartsPage.tsx")),
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/library",
    component: lazyRouteComponent(() => import("./LibraryPage.tsx")),
  }),
  // Pre-built gym gallery (#184); "Open in builder" links to /?gym=<slug>.
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/gyms",
    component: lazyRouteComponent(() => import("./GymsPage.tsx")),
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/gyms/$slug",
    component: lazyRouteComponent(() => import("./GymsPage.tsx"), "GymDetailPage"),
  }),
]);
