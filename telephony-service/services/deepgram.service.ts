import { createClient, DeepgramClient } from "@deepgram/sdk";

export interface DeepgramTranscriptionResults {
    speech_final: boolean;
    start: number;
    duration: number;
    channel: {
        alternatives: [
            {
                transcript: string;
                confidence: number;
            }
        ]
    }
}

export class DeepgramService {
    private _client: DeepgramClient;

    constructor() {
        this._client = createClient(process.env.DEEPGRAM_API_KEY);
    }

    public getListenSocket() {
        return this._client.listen.live({
            model: "nova-2",
            language: "multi",
            encoding: "mulaw",
            sample_rate: 8000,
            interim_results: true,
            endpointing: 500,
            vad_events: true
        });
    }
}