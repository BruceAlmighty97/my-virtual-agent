import { Test, TestingModule } from '@nestjs/testing';
import { AgentGraphService } from './agent-graph.service';

describe('AgentGraphService', () => {
  let service: AgentGraphService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentGraphService],
    }).compile();

    service = module.get<AgentGraphService>(AgentGraphService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
