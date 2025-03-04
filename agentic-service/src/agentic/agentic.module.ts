import { Module } from '@nestjs/common';
import { AgenticController } from './agentic.controller';
import { DocumentService } from './document.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LlmModelService } from './llm-model.service';

@Module({
  imports: [ConfigModule],
  controllers: [AgenticController],
  providers: [DocumentService, ConfigService, LlmModelService]
})
export class AgenticModule {}
