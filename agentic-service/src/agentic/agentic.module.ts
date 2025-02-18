import { Module } from '@nestjs/common';
import { AgenticController } from './agentic.controller';

@Module({
  controllers: [AgenticController]
})
export class AgenticModule {}
