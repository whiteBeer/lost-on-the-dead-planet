import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router";
import { createRoot } from "react-dom/client";

import Main from "./react-app/Pages/Main";
import Room from "./react-app/Pages/Room";


function ReactApp() {
    return (
        <Router>
            <Routes>
                <>
                    <Route path="/" element={<Main />} />
                    <Route path="/rooms/*" element={<Room />} />
                </>
            </Routes>
        </Router>
    );
}

const root = createRoot(document.getElementById("react-app")!);
root.render(<ReactApp/>);
