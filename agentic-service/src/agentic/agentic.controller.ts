import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SimpleQueryRequestDto } from './dtos/simple-query-request.dto';
import { SimpleQueryResponseDto } from './dtos/simple-query-response.dto';
import { ApiKeyGuard } from './api-key.guard';
import { MyGraphService } from './services/my-graph.service';
import { TelephonyQueryRequest } from './dtos/telephony-query-request.dto';
import { TelephonyQueryResponse } from './dtos/telephony-query-response.dto';

@Controller('agentic')
@UseGuards(ApiKeyGuard)
export class AgenticController {
  constructor(
    private _myGraphService: MyGraphService
  ) {}

  @Post('/start-session')
  startSession(): string {
    return 'Session started';
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

  @Post('/telephony-request')
  async telephonyRequest (
    @Body() request: TelephonyQueryRequest
  ): Promise<TelephonyQueryResponse> {
    const response = await this._myGraphService.telephonyRequest(request);
    return response;
  }
}
