import HttpError from "./httpError";
import joi from "joi";

export default function errorHandler (err:any, req:any, res:any, next:any) {
    let message = "Bad request";
    let name = "Unknown";
    let code = 400;

    switch (err.constructor) {
    case SyntaxError:
    case TypeError:
        console.error("Server Error. ", err);
        message = "Server Error";
        code = 500;
        break;
    case joi.ValidationError:
        name = "RequestValidationError";
        message = err.message;
        code = 422;
        break;
    case HttpError:
        name = err.name;
        message = err.message;
        code = err.statusCode;
        break;
    default:
        message = err?.message || message;
    }

    res.status(code).json({
        error: {name, message}
    });
    next();
}
