import { Request, Response, NextFunction } from "express";
import joi from "joi";

interface CaughtError {
    type?:string;
    name?:string;
    message?:string;
    statusCode?:number;
    constructor?:unknown;
}

function asCaughtError(err:unknown):CaughtError {
    if (typeof err === "object" && err !== null) {
        return err as CaughtError;
    }
    return {};
}

export default function errorHandler(err:unknown, req:Request, res:Response, next:NextFunction) {
    if (res.headersSent) {
        next(err instanceof Error ? err : undefined);
        return;
    }

    const error = asCaughtError(err);
    let message = "Bad request";
    let name = "Unknown";
    let code = 400;

    if (error.type === "HttpError") {
        name = error.name || name;
        message = error.message || message;
        code = error.statusCode || code;
    } else if (error.constructor === joi.ValidationError) {
        name = "RequestValidationError";
        message = error.message || message;
        code = 422;
    } else if (error.constructor === TypeError || error.constructor === SyntaxError) {
        console.error("Server Error. ", err);
        message = "Server Error";
        code = 500;
    } else {
        message = error.message || message;
    }

    res.status(code).json({
        error: { name, message }
    });
}
