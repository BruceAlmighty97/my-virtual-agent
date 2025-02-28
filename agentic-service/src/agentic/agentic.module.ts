import { Module } from '@nestjs/common';
import { AgenticController } from './agentic.controller';
import { DocumentService } from './document.service';

@Module({
  controllers: [AgenticController],
  providers: [DocumentService]
})
export class AgenticModule {}
