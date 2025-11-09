export default class HttpError extends Error {

    statusCode;
    name;
    type = "HttpError";

    constructor(name:string, message:string, statusCode = 400) {
        super(message);

        this.name = name;
        this.statusCode = statusCode;
    }
}
