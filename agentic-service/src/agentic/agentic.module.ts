import { Module } from '@nestjs/common';
import { AgenticController } from './agentic.controller';
import { DocumentService } from './document.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [AgenticController],
  providers: [DocumentService, ConfigService]
})
export class AgenticModule {}
