import {App} from "./src/App";

(async () => {
    const app = new App("prod");
    await app.init();
    document?.getElementById("game")?.appendChild(app.getView());
})();