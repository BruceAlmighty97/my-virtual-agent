import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AgenticModule } from './agentic/agentic.module';

@Module({
  imports: [AgenticModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
