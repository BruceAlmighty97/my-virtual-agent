import { Express, Request, Response  } from 'express';
import { twiml } from "twilio";
import axios from 'axios';

export class RestController {
    private _app: Express;

    constructor(app: Express) {
        this._app = app;
    }

    public initialize() {
        // Health check endpoint
        this._app.get("/", (req: Request, res: Response) => {
            res.status(200).send('OK');
        });

        this._app.get("/test1", async (req: Request, res: Response) => {
            console.log('hello')
            try {
                const response = await axios.get('http://agentic.geoffreyholland.com:80');
                const data = response.data;
                res.status(200).send(data)
            } catch (error) {
                console.log(error)
                res.status(500).send('Error fetching data');
            }
        });

        this._app.post("/twilio", (req: Request, res: Response) => {
            console.log("Call Sid: ", req.body.CallSid);
            console.log("Call Status: ", req.body.CallStatus);

            const response = new twiml.VoiceResponse();
            response.connect({ action: "/status" }).stream({
                url: `wss://${req.headers.host}?CallSid=${req.body.CallSid}`,
                name: "GeoffreyStream"
            });
            res.type("text/xml");
            res.send(response.toString());
        });
    }
}