export function ok(data, message = "") {
    return { success: true, data, message };
}
export function fail(message, data = {}) {
    return { success: false, data, message };
}
//# sourceMappingURL=types.js.map