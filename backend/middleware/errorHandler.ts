import joi from "joi";

export default function errorHandler (err:any, req:any, res:any, next:any) {
    let message = "Bad request";
    let name = "Unknown";
    let code = 400;

    if (err.type === "HttpError") {
        name = err.name;
        message = err.message;
        code = err.statusCode;
    } else if (err.constructor === joi.ValidationError) {
        name = "RequestValidationError";
        message = err.message;
        code = 422;
    } else if (err.constructor === TypeError || err.constructor === SyntaxError) {
        console.error("Server Error. ", err);
        message = "Server Error";
        code = 500;
    } else {
        message = err?.message || message;
    }

    res.status(code).json({
        error: {name, message}
    });
}
