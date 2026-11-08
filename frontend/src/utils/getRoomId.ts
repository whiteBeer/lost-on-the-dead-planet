export const getRoomId = () => {
    if (typeof window === "undefined") {
        return "";
    }
    const arr = window.location.pathname.split("/");
    return arr[arr.length - 1] || "";
};
