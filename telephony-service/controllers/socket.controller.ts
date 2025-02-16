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
        this._ws.on("connection", async (ws: WebSocket, request: IncomingMessage) => {
            const deepgramSocket = this._deepgramService.getListenSocket();
            let callSid: string;
            let streamSid: string;

            ws.onmessage = async (message: WebSocket.MessageEvent) => {
                const data = JSON.parse(message.data.toString()) as TwilioSocketMessage;

                if (data.event === 'start') {
                    callSid = data.start?.callSid ?? "";
                    streamSid = data.start?.streamSid ?? "";
                    console.log(`Call started for callSid ${callSid}`);
                }

                if (data.event === 'media') {
                    const payload = data.media?.payload ?? "";
                    const audioBuffer = Buffer.from(payload, 'base64');
                    deepgramSocket.send(audioBuffer);
                }
            }
            
            

            ws.on("close", () => {
                console.log(`Call ended for callSid ${callSid}`);
            });
        });
    }
}