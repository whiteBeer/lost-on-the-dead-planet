import {App} from "./src/App";

(async () => {
    const app = new App("dev");
    await app.init();
    document?.getElementById("game")?.appendChild(app.getView());
})();
