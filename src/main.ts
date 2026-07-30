import { render } from "@madojs/mado";
import "./styles/mado-ui-theme.css";
import "./styles/mado-ui-button.css";
import "./styles/mado-ui-code.css";
import "./styles/mado-ui-layout.css";
import "./styles/mado-ui-navigation-list.css";
import "./styles/mado-ui-page-header.css";
import "./styles/mado-ui-popover.css";
import "./styles/mado-ui-content-state.css";
import "./styles/foundation.css";
import "./styles/shell.css";
import "./styles/content.css";

import { siteShell } from "./site-shell";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app");

render(siteShell(), app);
