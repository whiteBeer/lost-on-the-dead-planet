import React from "react";


function Button(props:any) {

    return (
        <div style={{color: "blue", cursor: "pointer", margin: "10px", fontSize: "24px"}} onClick={props.onClick}>
            {props.children}
        </div>
    );
}

export default Button;
