import { Module } from '@nestjs/common';
import { AgenticController } from './agentic.controller';
import { DocumentService } from './services/document.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LlmModelService } from './services/llm-model.service';
import { AgentGraphService } from './services/agent-graph.service';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  imports: [ConfigModule],
  controllers: [AgenticController],
  providers: [
    DocumentService,
    ConfigService,
    LlmModelService,
    AgentGraphService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard
    }
  ],
})
export class AgenticModule {}
