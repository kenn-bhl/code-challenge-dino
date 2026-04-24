export function asyncHandler(handler) {
    return (req, res, next) => {
        void handler(req, res).catch(next);
    };
}
//# sourceMappingURL=asyncHandler.js.map