import { ElevenLabsClient } from "elevenlabs";
import { Readable } from "stream";

export class ElevenlabsService {
    private _elevenlabsClient: ElevenLabsClient;

    constructor() {
        this._elevenlabsClient = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY,
        });
    }

    public async convertTextToSpeect(text: string) {
        const speechResponse = await this._elevenlabsClient.textToSpeech.convert(
            process.env.ELEVENLABS_VOICE_ID ?? '', 
            {
                model_id: 'eleven_flash_v2_5',
                output_format: 'ulaw_8000',
                text: text
            }
        );
        const readableStream = Readable.from(speechResponse);
        const audioArrayBuffer = await this.streamToArrayBuffer(readableStream);
        return Buffer.from(audioArrayBuffer as any).toString('base64');
    }

    private async streamToArrayBuffer(readableStream: Readable) {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            readableStream.on('data', (chunk) => {
                chunks.push(chunk);
            });
            readableStream.on('end', () => {
                resolve(Buffer.concat(chunks).buffer);
            });
            readableStream.on('error', reject);
        });
    }
}