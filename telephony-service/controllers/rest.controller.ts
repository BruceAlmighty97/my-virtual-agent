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

        this._app.post("/twilio", (req: Request, res: Response) => {
            const response = new twiml.VoiceResponse();
            const connect = response.connect({ action: "/status" }).stream({
                url: `wss://${req.headers.host}?CallSid=${req.body.CallSid}`,
                name: "GeoffreyStream"
            })
            connect.parameter({
                name: "CallSid",
                value: req.body.CallSid
            })
            connect.parameter({
                name: "FromNumber",
                value: req.body.From
            });
            res.type("text/xml");
            res.send(response.toString());
        });
    }
}