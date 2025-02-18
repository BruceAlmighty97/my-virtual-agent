import { Test, TestingModule } from '@nestjs/testing';
import { AgenticController } from './agentic.controller';

describe('AgenticController', () => {
  let controller: AgenticController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgenticController],
    }).compile();

    controller = module.get<AgenticController>(AgenticController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
