import axios from "axios";
import {App} from "./App";

export class Toolbar {

    app:App;

    constructor (app:App)  {
        this.app = app;
        this.newGameListener();
        this.addZombieListener();
        this.addSpiderListener();
    }

    newGameListener () {
        const $btn = document.getElementById("btn-new-game");
        if ($btn) {
            $btn.addEventListener("click", async () => {
                await axios.put(this.app.backendUrl + "/api/new-game");

                // TODO: make separate event "new-game" or something to update for every player
                const backendScene = (await axios.get(this.app.backendUrl + "/api/scene")).data;
                this.app.scene?.enemiesCollection.enemiesFromBackendScene(backendScene);
            });
        }
    }

    addZombieListener () {
        const $btn = document.getElementById("btn-add-zombie");
        if ($btn) {
            $btn.addEventListener("click", async () => {
                await axios.put(this.app.backendUrl + "/api/sandbox/add-zombie");

                // TODO: make separate event "new-game" or something to update for every player
                const backendScene = (await axios.get(this.app.backendUrl + "/api/scene")).data;
                this.app.scene?.enemiesCollection.enemiesFromBackendScene(backendScene);
            });
        }

        const $btn10 = document.getElementById("btn-add-zombie-10");
        if ($btn10) {
            $btn10.addEventListener("click", async () => {
                for(let i=0; i<10; i++) {
                    await axios.put(this.app.backendUrl + "/api/sandbox/add-zombie");
                }

                // TODO: make separate event "new-game" or something to update for every player
                const backendScene = (await axios.get(this.app.backendUrl + "/api/scene")).data;
                this.app.scene?.enemiesCollection.enemiesFromBackendScene(backendScene);
            });
        }
    }

    addSpiderListener () {
        const $btn = document.getElementById("btn-add-spider");
        if ($btn) {
            $btn.addEventListener("click", async () => {
                await axios.put(this.app.backendUrl + "/api/sandbox/add-spider");

                // TODO: make separate event "new-game" or something to update for every player
                const backendScene = (await axios.get(this.app.backendUrl + "/api/scene")).data;
                this.app.scene?.enemiesCollection.enemiesFromBackendScene(backendScene);
            });
        }
    }

}