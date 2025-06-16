export default class HttpError extends Error {

    statusCode;

    constructor(name:string, message:string, statusCode = 400) {
        super(message);

        this.name = name;
        this.statusCode = statusCode;
    }
}
