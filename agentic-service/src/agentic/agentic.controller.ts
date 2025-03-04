import { Controller, Post } from '@nestjs/common';

@Controller('agentic')
export class AgenticController {

    constructor() {};

    @Post('/start-session')
    startSession(): string {
        return "Session started";
    }

}
