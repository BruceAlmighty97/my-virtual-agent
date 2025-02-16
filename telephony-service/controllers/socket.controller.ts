import { IncomingMessage } from "http";
import WebSocket, { WebSocketServer } from "ws";

export class SocketController {
    private _ws: WebSocketServer;

    constructor(ws: WebSocketServer) {
        this._ws = ws;
    }

    public initialize() {
        this._ws.on("connection", (ws: WebSocket, request: IncomingMessage) => {
            console.log("Connection established", request);

            ws.on("message", (message) => {
                console.log(`Received message => ${message}`);
            });

            ws.on("close", () => {
                console.log("Connection closed");
            });
        });
    }
}