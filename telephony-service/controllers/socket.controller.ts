import { IncomingMessage } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { DeepgramService } from "../services/deepgram.service";

interface TwilioSocketMessage {
    event: 'start' | 'stop' | 'media';
    sequenceNumber: string;
    streamSid: string;
    start?: {
        streamSid: string;
        callSid: string;
    }
    media?: {
        track: string;
        timestamp: number;
        payload: string;
    }
}

export class SocketController {
    private _ws: WebSocketServer;
    private _deepgramService: DeepgramService;

    constructor(ws: WebSocketServer) {
        this._ws = ws;
        this._deepgramService = new DeepgramService();
    }

    public initialize() {
        this._ws.on("connection", (ws: WebSocket, request: IncomingMessage) => {
            const url = new URL(request.url || '', `wss://${request.headers.host}`);
            const callSid = url.searchParams.get('CallSid');
            console.log(`Call started for callSid ${callSid}`);
            
            // ws.on("message", (message) => {
            //     console.log(`Received message => ${message}`);
            // });

            ws.on("close", () => {
                console.log(`Call ended for callSid ${callSid}`);
            });
        });
    }
}