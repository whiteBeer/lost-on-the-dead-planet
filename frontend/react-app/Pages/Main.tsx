import React from "react";
import Button from "../Components/Button";
import  { useNavigate  } from "react-router";


function Main() {

    const navigate = useNavigate();

    const createRoom = () => {
        const roomName = prompt("Enter room name");
        if (roomName) {
            navigate("/rooms/" + roomName);
        }
    };

    const joinRoom = () => {
        const roomName = prompt("Enter room name");
        if (roomName) {
            navigate("/rooms/" + roomName);
        }
    };

    return (
        <div style={{ margin: "100px", textAlign: "center"}}>
            Menu
            <Button onClick={joinRoom}>Join Game</Button>
            <Button onClick={createRoom}>Create Game</Button>
        </div>
    );
}

export default Main;
