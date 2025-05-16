"use client";

import React from "react";
import Button from "../components/Button";
import { useRouter } from "next/navigation";

function Main() {

    const router = useRouter();

    const createRoom = () => {
        const roomName = prompt("Enter room name");
        if (roomName) {
            router.push("/rooms/" + roomName);
        }
    };

    const joinRoom = () => {
        const roomName = prompt("Enter room name");
        if (roomName) {
            router.push("/rooms/" + roomName);
        }
    };

    return (
        <div className="flex flex-col items-center mt-10 text-xl font-bold">
            Menu
            <Button className="mt-3" onClick={joinRoom}>Join Game</Button>
            <Button className="mt-3" onClick={createRoom}>Create Game</Button>
        </div>
    );
}

export default Main;
