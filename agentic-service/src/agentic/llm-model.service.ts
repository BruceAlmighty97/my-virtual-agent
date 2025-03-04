import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from "@langchain/openai";
import { ConfigService } from '@nestjs/config';

export enum OpenAiLlmModels {
    GPT_4O = 'gpt-4o',
    GPT_4O_MINI = 'gpt-4o-mini',
    GPT_40_TURBO = 'gpt-4-turbo',
}

@Injectable()
export class LlmModelService {
    private _openaiKey: string;

    constructor(private _configService: ConfigService) {
        this._openaiKey = this._configService.get<string>('OPENAI_API_KEY') || '';
    }

    public getOpenAiModel(model: OpenAiLlmModels): ChatOpenAI {
        return new ChatOpenAI({
            model: model,
            temperature: 0,
            apiKey: this._openaiKey
        });
    }
}
