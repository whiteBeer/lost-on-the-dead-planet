import {App} from "./src/App";

(async () => {
    const app = new App("prod");
    await app.init();
    document.body.appendChild(app.getView());
})();