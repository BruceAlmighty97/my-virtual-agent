import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Annotation, StateGraph, MemorySaver, AnnotationRoot, START, END, CompiledStateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import { LlmModelService, OpenAiLlmModels } from './llm-model.service';
import { DocumentService } from './document.service';
import { SimpleQueryRequestDto } from '../dtos/simple-query-request.dto';
import { AIMessage, BaseMessage, ChatMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { TelephonyQueryRequest } from '../dtos/telephony-query-request.dto';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { TelephonyQueryResponse } from '../dtos/telephony-query-response.dto';
import { response } from 'express';


@Injectable()
export class MyGraphService {
    private _llm: ChatOpenAI;
    private _stateAnnotation: AnnotationRoot<any>;
    private _agent;
    private _redisClient: Redis;

    constructor(
        private _configService: ConfigService,
        private _llmModelService: LlmModelService,
        private _documentService: DocumentService
    ) {
        this._llm = this._llmModelService.getOpenAiModel(OpenAiLlmModels.GPT_35_TURBO);
        this._stateAnnotation = Annotation.Root({
            messages: Annotation<BaseMessage[]>({
                reducer: (x, y) => x.concat(y),
            }),
            hasVisited: Annotation<boolean>(),
            threadId: Annotation<string>(),
        });

        const redisHost = this._configService.get<string>('REDIS_HOST');
        const redisPort = this._configService.get<number>('REDIS_PORT');

        this._redisClient = new Redis({
            host: this._configService.get<string>('REDIS_HOST'),
            port: this._configService.get<number>('REDIS_PORT'),
        });

        this._redisClient.on('error', (err) => {
            console.error('Redis error:', err);
        });

        const builder = new StateGraph(this._stateAnnotation)
            .addNode("orchestrator", this.orchestratorNode.bind(this))
            .addNode("greeting", this.greetingNode.bind(this))
            .addNode("workExperience", this.workExperienceNode.bind(this))
            .addNode("resumeEmail", this.resumeEmailNode.bind(this))
            .addNode("outsideQuestions", this.handleOutsideQuestions.bind(this))
            .addEdge(START, "orchestrator")
            .addConditionalEdges("orchestrator", this.orchestratorRouter.bind(this), ["greeting", "workExperience", "resumeEmail", "outsideQuestions"])
            .addEdge("greeting", END)
            .addEdge("workExperience", END)
            .addEdge("resumeEmail", END)
            .addEdge("outsideQuestions", END);

        
        this._agent = builder.compile({
            checkpointer: new MemorySaver()
        });
    }

    private async orchestratorNode(input: typeof this._stateAnnotation.State): Promise<typeof this._stateAnnotation.State> {
        console.log("Orchestrator node called with.", input);
        const latestHumanMessage: HumanMessage = input.messages.findLast(msg => msg instanceof HumanMessage);
        const prompt = `
            You are a virtual agent meant to handle queries about a candidate but may have other functions as well.
            One function is to greet the user. Another is to handle inquiries to have the candidate's resume emailed.
            A third function is to provide information about the candidate's work experience. Take the following message
            and determine which function to perform:
            "${latestHumanMessage.content}"

            You should return with a single word response: "greeting", "workExperience", or "resumeEmail" according to the following:

            - If the user is greeting you, respond with "greeting".
            - If the user is asking for the candidate's resume to be emailed, respond with "resumeEmail".
            - If the user is asking about the candidate's work experience, respond with "workExperience".
            - If the question doesn't fit any of these categories, respond with "outsideQuestions".
        `
        const llmResponse = await this._llm.generate(
            [[
                {role: "system", content: prompt}
            ]]
        );
        console.log("LLM Response:", JSON.stringify(llmResponse));
        console.log("Latest HumanMessage:", latestHumanMessage.content);
        return {
            messages: [new SystemMessage(llmResponse.generations[0][0].text)],
            threadId: input.threadId
        };
    }

    private orchestratorRouter(state: typeof this._stateAnnotation.State): string[] {
        const latestSystemMessage: SystemMessage = state.messages.findLast(msg => msg instanceof SystemMessage);
        return [latestSystemMessage.content.toString()];
    }

    private async greetingNode(input: typeof this._stateAnnotation.State): Promise<typeof this._stateAnnotation.State> {
        const message = input.hasVisited ? "Hello again! How can I assist you today?" : "Hello! How can I assist you today?";
        return {
            messages: [new AIMessage(message)],
            hasVisited: true,
            threadId: input.threadId
        };
    }

    private async workExperienceNode(input: typeof this._stateAnnotation.State): Promise<typeof this._stateAnnotation.State> {
        const prompt = `
            You are a virtual agent meant to handle questions about a candidates work experience. You have access to his resume
            and a large body of text information from which to pull from. You should respond with a message that provides the
            answer the user's question, based on the textual context provided. Answer in a friendly manner and use the chat context
            to prevent yourself from repeating information too much. Here is the information:

            question: ${input.messages.findLast(msg => msg instanceof HumanMessage).content}
            work context: ${this._documentService.getDocumentText()}
            chat history: ${input.messages}
        `
        const llmResponse = await this._llm.generate(
            [[
                {role: "system", content: prompt}
            ]]
        );
        return {
            messages: [new AIMessage(llmResponse.generations[0][0].text)],
            threadId: input.threadId
        };
    }

    private async resumeEmailNode(input: typeof this._stateAnnotation.State): Promise<typeof this._stateAnnotation.State> {
        return {
            messages: [new AIMessage("Please provide your email, and I will send you the candidate’s resume.")],
            threadId: input.threadId
        };
    }

    private async handleOutsideQuestions(input: typeof this._stateAnnotation.State): Promise<typeof this._stateAnnotation.State> {
        const prompt = `
            You are a virtual agent meant to handle queries about specific topics. You have determined that the
            current query is outside the scope of your capabilities. You should respond with a message indicating
            that you are unable to answer the question. Do so in a friendly tone and ask how else you can assist the user.
            Redirect the user to questions about the candidate's work experience.
        `
        const llmResponse = await this._llm.generate(
            [[
                {role: "system", content: prompt}
            ]]
        );
        return {
            messages: [new AIMessage(llmResponse.generations[0][0].text)],
            threadId: input.threadId
        };
    }

    public async makeSimpleQuery(request: SimpleQueryRequestDto): Promise<string> {
        const config: RunnableConfig = {
            runId: request.sessionId,
            configurable: {
                thread_id: request.sessionId
            }
        }
        const response = await this._agent.invoke(
            {
                messages: [new HumanMessage(request.inputText)],
                threadId: request.sessionId
            }, 
            config
        );
        if (!response.messages || response.messages.length === 0) {
            console.warn("No messages found in response.");
            return "No response generated.";
        }
    
        const latestMessage = response.messages.findLast(msg => msg instanceof AIMessage);
    
        if (latestMessage) {
            console.log("Returning AI response:", latestMessage.content);
            return latestMessage.content;
        } else {
            console.warn("No AI message found in response.");
            return "No AI response available.";
        }
    }

    public async telephonyRequest(request: TelephonyQueryRequest): Promise<TelephonyQueryResponse> {
        const redisKey = `telephone:${request.fromNumber}`;
        let sessionId = await this._redisClient.get(redisKey);
        let responseMessage = `I'm sorry, there must have been an issue with the system`

        if (!sessionId) {
            sessionId = uuidv4();
            await this._redisClient.set(redisKey, sessionId);
        }
        const config: RunnableConfig = {
            runId: sessionId,
            configurable: {
                thread_id: sessionId
            }
        }
        const response = await this._agent.invoke(
            {
                messages: [new HumanMessage(request.input)],
                threadId: sessionId
            }, 
            config
        );

        if (!response.messages || response.messages.length === 0) {
            console.warn("No messages found in response.");
        }
    
        const latestMessage = response.messages.findLast(msg => msg instanceof AIMessage);
    
        if (latestMessage) {
            responseMessage = latestMessage.content
        } else {
            console.warn("No AI message found in response.");
        }

        return {
            input: request.input,
            fromNumber: request.fromNumber,
            response: responseMessage
        } as TelephonyQueryResponse;
    }
}
