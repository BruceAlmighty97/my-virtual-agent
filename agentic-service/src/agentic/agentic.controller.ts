import { Body, Controller, Post } from '@nestjs/common';
import { AgentGraphService } from './services/agent-graph.service';
import { SimpleQueryRequestDto } from './dtos/simple-query-request.dto';
import { SimpleQueryResponseDto } from './dtos/simple-query-response.dto';

@Controller('agentic')
export class AgenticController {
  constructor(private _agentGraphService: AgentGraphService) {}

  @Post('/start-session')
  startSession(): string {
    return 'Session started';
  }

  @Post('/simple-query')
  async simpleQuery(
    @Body() request: SimpleQueryRequestDto,
  ): Promise<SimpleQueryResponseDto> {
    const answer = await this._agentGraphService.makeSimpleQuery(request);
    console.log(`Answer: ${answer}`);
    return {
      inputText: request.inputText,
      outputText: answer,
      sessionId: request.sessionId,
    };
  }
}
