import {App} from "./src/App";

(async () => {
    const app = new App("dev");
    await app.init();
    document.body.appendChild(app.getView());
})();
