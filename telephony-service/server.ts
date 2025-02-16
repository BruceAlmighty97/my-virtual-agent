import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { RestController } from "./controllers/rest.controller";
import { SocketController } from "./controllers/socket.controller";
import { WebSocketServer } from "ws";

dotenv.config();

const app: Express = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
const wss = new WebSocketServer({ server });

const restController = new RestController(app);
const socketController = new SocketController(wss);
restController.initialize();
socketController.initialize();