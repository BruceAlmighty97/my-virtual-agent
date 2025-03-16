import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AgentGraphService } from './services/agent-graph.service';
import { SimpleQueryRequestDto } from './dtos/simple-query-request.dto';
import { SimpleQueryResponseDto } from './dtos/simple-query-response.dto';
import { ApiKeyGuard } from './api-key.guard';
import { MyGraphService } from './services/my-graph.service';

@Controller('agentic')
@UseGuards(ApiKeyGuard)
export class AgenticController {
  constructor(
    private _agentGraphService: AgentGraphService,
    private _myGraphService: MyGraphService
  ) {}

  @Post('/start-session')
  startSession(): string {
    return 'Session started';
  }

  @Post('/simple-query')
  async simpleQuery(
    @Body() request: SimpleQueryRequestDto,
  ): Promise<SimpleQueryResponseDto> {
    const answer = await this._agentGraphService.makeSimpleQuery(request);
    // console.log(`Answer: ${answer}`);
    return {
      inputText: request.inputText,
      outputText: answer,
      sessionId: request.sessionId,
    };
  }

  @Post('/call-my-graph')
  async callMyGraph(
    @Body() request: SimpleQueryRequestDto,
  ): Promise<SimpleQueryResponseDto> {
    const answer = await this._myGraphService.makeSimpleQuery(request);
    // console.log(`Answer: ${answer}`);
    return {
      inputText: request.inputText,
      outputText: answer,
      sessionId: request.sessionId,
    };
  }
}
