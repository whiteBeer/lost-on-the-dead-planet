import Joi from "joi";

export const roomIdValidator = Joi.object({
    roomId: Joi.string().pattern(new RegExp("^[a-zA-Z0-9]{3,30}$"))
});

