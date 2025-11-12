import { StatusCodes } from "http-status-codes";
import HttpError from "./httpError";

export default class BadRequestError extends HttpError {

    statusCode = StatusCodes.BAD_REQUEST;

    constructor(message:string) {
        super("BadRequest", message);
    }
}
