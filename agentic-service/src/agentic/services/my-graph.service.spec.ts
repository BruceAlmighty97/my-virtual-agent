import { Test, TestingModule } from '@nestjs/testing';
import { MyGraphService } from './my-graph.service';

describe('MyGraphService', () => {
  let service: MyGraphService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyGraphService],
    }).compile();

    service = module.get<MyGraphService>(MyGraphService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
