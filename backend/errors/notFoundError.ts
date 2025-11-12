import { StatusCodes } from "http-status-codes";
import HttpError from "./httpError";

export default class NotFoundError extends HttpError {

    statusCode = StatusCodes.NOT_FOUND;

    constructor(message:string) {
        super("NotFound", message);
    }
}
