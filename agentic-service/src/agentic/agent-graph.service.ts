import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Annotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import Redis from "ioredis";
import dotenv from "dotenv";
import { LlmModelService, OpenAiLlmModels } from './llm-model.service';
import { DocumentService } from './document.service';
import { Document } from "@langchain/core/documents";
import { SimpleQueryRequestDto } from './dto/simple-query-request.dto';

@Injectable()
export class AgentGraphService implements OnModuleInit{
    // private _redisClient: Redis;
    private _llm: ChatOpenAI;
    private _agentGraph;
    private _inputStateAnnotation = Annotation.Root({
        question: Annotation<string>,
    });
    private _stateAnnotation = Annotation.Root({
        question: Annotation<string>,
        context: Annotation<Document[]>,
        answer: Annotation<string>,
    });
    private _ragTemplate: ChatPromptTemplate;

    constructor(
        private _configService: ConfigService,
        private _llmModelService: LlmModelService,
        private _documentService: DocumentService,
    ) {
        // this._redisClient = new Redis({
        //     host: this._configService.get<string>('REDIS_HOST') || 'localhost',
        //     port: this._configService.get<number>('REDIS_PORT') || 6379,
        // });

        this._llm = this._llmModelService.getOpenAiModel(OpenAiLlmModels.GPT_35_TURBO);
    }

    private async retrieve(state: typeof this._inputStateAnnotation.State) {
        console.log(`Retrieving documents for question: ${state.question}`);
        const retrievedDocs = await this._documentService.similaritySearch(state.question);
        return { context: retrievedDocs };
    }

    private async generate(state: typeof this._stateAnnotation.State) {
        const docsContent = state.context.map(doc => doc.pageContent).join("\n");
        const messages = await this._ragTemplate.invoke({ question: state.question, context: docsContent });
        console.log(`Rendered template...`, messages);
        const response = await this._llm.invoke(messages);
        return { answer: response.content };
    }

    async onModuleInit(): Promise<void> {
        this._ragTemplate = await pull<ChatPromptTemplate>("rlm/rag-prompt");
        this._agentGraph = this.constructGraph();
    }

    private constructGraph() {
        const graph = new StateGraph(this._stateAnnotation)
            .addNode("retrieve", this.retrieve.bind(this))
            .addNode("generate", this.generate.bind(this))
            .addEdge("__start__", "retrieve")
            .addEdge("retrieve", "generate")
            .addEdge("generate", "__end__")
            .compile();
        return graph;
    }

    public async makeSimpleQuery(request: SimpleQueryRequestDto): Promise<string> {
        const response = await this._agentGraph.invoke({
            question: request.inputText,
        })
        return response.answer;
    }
}
