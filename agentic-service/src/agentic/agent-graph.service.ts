import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Annotation, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import { LlmModelService, OpenAiLlmModels } from './llm-model.service';
import { DocumentService } from './document.service';
import { Document } from '@langchain/core/documents';
import { SimpleQueryRequestDto } from './dto/simple-query-request.dto';

@Injectable()
export class AgentGraphService implements OnModuleInit {
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
    this._llm = this._llmModelService.getOpenAiModel(
      OpenAiLlmModels.GPT_35_TURBO,
    );
  }

  private async retrieve(state: typeof this._inputStateAnnotation.State) {
    console.log(`Retrieving documents for question: ${state.question}`);
    const retrievedDocs = await this._documentService.similaritySearch(
      state.question,
    );
    return { context: retrievedDocs };
  }

  private async generate(state: typeof this._stateAnnotation.State) {
    const docsContent = state.context.map((doc) => doc.pageContent).join('\n');
    const messages = await this._ragTemplate.invoke({
      question: state.question,
      context: docsContent,
    });
    console.log(`Rendered template...`, messages);
    const response = await this._llm.invoke(messages);
    return { answer: response.content };
  }

  onModuleInit(): void {
    this._ragTemplate = new ChatPromptTemplate({
      templateFormat: 'f-string',
      inputVariables: ['context', 'question'],
      validateTemplate: true,
      promptMessages: [
        SystemMessagePromptTemplate.fromTemplate(`
                    You are a virtual assistant meant to answer questions about the work experience of Geoff Holland.
                    You will have access to a set of documents that contain information about Geoff's work experience.
                    You can use this information to answer questions about Geoff's work experience. Don't use his full name, just refer to him as Geoff.
                    Be friendly and helpful in your responses.
                    Try and limit responses to 4-5 sentences if possible.
                    Here is the context {context}
                    Here is the question {question}
                    Answer the question.
                `),
      ],
    });
    this._agentGraph = this.constructGraph();
  }

  private constructGraph() {
    const graph = new StateGraph(this._stateAnnotation)
      .addNode('retrieve', this.retrieve.bind(this))
      .addNode('generate', this.generate.bind(this))
      .addEdge('__start__', 'retrieve')
      .addEdge('retrieve', 'generate')
      .addEdge('generate', '__end__')
      .compile();
    return graph;
  }

  public async makeSimpleQuery(
    request: SimpleQueryRequestDto,
  ): Promise<string> {
    const response = await this._agentGraph.invoke({
      question: request.inputText,
    });
    return response.answer;
  }
}
