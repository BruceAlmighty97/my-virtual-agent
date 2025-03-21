import { IncomingMessage } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { DeepgramService, DeepgramTranscriptionResults } from "../services/deepgram.service";
import { ElevenlabsService } from "../services/elevenlabs.service";
import { LiveTranscriptionEvents } from "@deepgram/sdk";
import { AgenticApiService } from "../services/agentic-api.service";

interface TwilioSocketMessage {
    event: 'start' | 'stop' | 'media';
    sequenceNumber: string;
    streamSid: string;
    start?: {
        streamSid: string;
        callSid: string;
        customParameters: {
            [key: string]: string;
        }
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
    private _elevenlabsService: ElevenlabsService;
    private _agenticApiService: AgenticApiService

    constructor(ws: WebSocketServer) {
        this._ws = ws;
        this._deepgramService = new DeepgramService();
        this._elevenlabsService = new ElevenlabsService();
        this._agenticApiService = new AgenticApiService();
    }

    public initialize() {
        this._ws.on("connection", async (ws: WebSocket, request: IncomingMessage) => {
            const deepgramSocket = this._deepgramService.getListenSocket();
            let callSid: string;
            let streamSid: string;
            let fromNumber: string;

            ws.onmessage = async (message: WebSocket.MessageEvent) => {
                const data = JSON.parse(message.data.toString()) as TwilioSocketMessage;

                if (data.event === 'start') {
                    callSid = data.start?.callSid ?? "";
                    streamSid = data.start?.streamSid ?? "";
                    fromNumber = data.start?.customParameters?.FromNumber ?? ""
                    const response = await this._agenticApiService.getAgenticResponse({
                        input: 'Hello',
                        fromNumber: fromNumber
                    });
                    this.sendAudioToCall(ws, streamSid, response.response);
                }

                if (data.event === 'media') {
                    const payload = data.media?.payload ?? "";
                    const audioBuffer = Buffer.from(payload, 'base64');
                    deepgramSocket.send(audioBuffer);
                }
            }

            deepgramSocket.on(LiveTranscriptionEvents.Open, () => {
                console.log(`Deepgram connection opened for callSid ${callSid}`);

                deepgramSocket.on(LiveTranscriptionEvents.Transcript, async (data: DeepgramTranscriptionResults) => {
                    if (data.speech_final) {
                        const transcript = data?.channel?.alternatives[0]?.transcript || "";
                        if (transcript !== "") {
                            console.log(`Transcript received for callSid ${callSid}: ${transcript}`);
                            const initTime = Date.now();
                            const response = await this._agenticApiService.getAgenticResponse({
                                input: transcript,
                                fromNumber: fromNumber
                            });
                            console.log(`Agentic api call took ${Date.now() - initTime} milliseconds`)
                            this.sendAudioToCall(ws, streamSid, response.response);
                        }
                    }
                });
            });

            ws.on("close", () => {
                console.log(`Call ended for callSid ${callSid}`);
            });
        });
    }

    private async sendAudioToCall(ws: WebSocket, streamSid: string, text: string) {
        ws.send(
           JSON.stringify({
               streamSid,
               event: 'media',
               media: {
                   payload: await this._elevenlabsService.convertTextToSpeect(text),
               },
           })
       );
   }
}