import React from "react";

interface Props {
    className:string;
    children:React.ReactElement | string;
    onClick:() => void;
}

function Button(props:Props) {

    const className = "btn btn-blue inline-block " + (props.className || "");

    return (
        <button className={className} onClick={props.onClick}>
            {props.children}
        </button>
    );
}

export default Button;