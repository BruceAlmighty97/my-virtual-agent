import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LlmModelService, OpenAiLlmModels } from './llm-model.service';
import { ChatOpenAI } from "@langchain/openai";

jest.mock("@langchain/openai");

describe('LlmModelService', () => {
  let service: LlmModelService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmModelService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<LlmModelService>(LlmModelService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should retrieve the API key from ConfigService', () => {
    expect(configService.get).toHaveBeenCalledWith('OPENAI_API_KEY');
  });

  it('should create a ChatOpenAI instance with the correct parameters', () => {
    const model = OpenAiLlmModels.GPT_4O;
    service.getOpenAiModel(model);

    expect(ChatOpenAI).toHaveBeenCalledWith({
      model: model,
      temperature: 0,
      apiKey: 'test-api-key',
    });
  });

  it('should return a ChatOpenAI instance', () => {
    const model = OpenAiLlmModels.GPT_4O;
    const chatModel = service.getOpenAiModel(model);

    expect(chatModel).toBeInstanceOf(ChatOpenAI);
  });
});