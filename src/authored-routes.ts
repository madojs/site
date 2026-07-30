export const authoredRoutes = {
  "/": () => import("./pages/home.page"),
  "/start": () => import("./pages/start.page"),
  "/why": () => import("./pages/why.page"),
  "/proof": () => import("./pages/proof.page"),
} as const;
