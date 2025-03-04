import { Module } from '@nestjs/common';
import { AgenticController } from './agentic.controller';
import { DocumentService } from './document.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LlmModelService } from './llm-model.service';
import { AgentGraphService } from './agent-graph.service';

@Module({
  imports: [ConfigModule],
  controllers: [AgenticController],
  providers: [DocumentService, ConfigService, LlmModelService, AgentGraphService]
})
export class AgenticModule {}
