export const getRoomId = () => {
    const arr = location.pathname.split("/");
    return arr[arr.length - 1];
};