import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AgenticModule } from './agentic/agentic.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [AgenticModule, ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
