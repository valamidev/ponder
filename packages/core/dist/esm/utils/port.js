import http from "node:http";
export const getNextAvailablePort = async ({ common }) => {
    const server = http.createServer();
    let port = common.options.port;
    return new Promise((resolve, reject) => {
        server.once("error", (error) => {
            if (error.code === "EADDRINUSE") {
                common.logger.warn({
                    service: "server",
                    msg: `Port ${port} was in use, trying port ${port + 1}`,
                });
                port += 1;
                setTimeout(() => {
                    server.close();
                    server.listen(port, common.options.hostname);
                }, 5);
            }
            else {
                reject(error);
            }
        });
        server.once("listening", () => {
            // Port is available
            server.close();
            resolve(port);
        });
        server.listen(port, common.options.hostname);
    });
};
//# sourceMappingURL=port.js.map