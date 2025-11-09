const notFound = (req:any, res:any) => {
    return res.status(404).send("Route does not exist.");
};

export default notFound;
