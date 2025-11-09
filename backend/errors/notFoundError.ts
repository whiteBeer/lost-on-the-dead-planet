import { StatusCodes } from "http-status-codes";
import HttpError from "./httpError";

export default class NotFoundError extends HttpError {
    constructor(message:string) {
        super("NotFound", message);
        this.statusCode = StatusCodes.NOT_FOUND;
    }
}
