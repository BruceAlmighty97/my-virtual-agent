import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createWriteStream, unlinkSync } from 'fs';
import { promisify } from 'util';
import * as stream from 'stream';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { DocumentInterface } from '@langchain/core/documents';

@Injectable()
export class DocumentService implements OnModuleInit {
  private readonly _s3BucketName = 'gbh-virtual-agent-documents';
  private readonly _s3Client: S3Client = new S3Client({ region: 'us-east-1' });
  private readonly _faissIndexPath = 'faiss_index';
  private _vectorStore: FaissStore;
  private _documentText: string = '';
  private _openaiKey: string;

  constructor(private _configService: ConfigService) {
    this._openaiKey = this._configService.get<string>('OPENAI_API_KEY') || '';
  }

  async onModuleInit() {
    try {
      const data = await this._s3Client.send(
        new ListObjectsV2Command({ Bucket: this._s3BucketName }),
      );

      if (!data.Contents || data.Contents.length === 0) {
        console.log('No files found in the S3 bucket');
        return;
      }

      let fullText = '';

      for (const file of data.Contents) {
        console.log(`Grabbing info from file... ${file.Key}`);
        if (!file.Key || !file.Key.endsWith('.pdf')) continue;
        const text = await this.downloadAndExtractText(file.Key);
        this._documentText += '\n' + text;
        // fullText += `
        //         --------------------------------------
        //         ${text}
        //         `;
      }
      // await this.vectorizeText(fullText);
    } catch (err) {
      console.error('Error fetching S3 bucket contents:', err);
    }
  }

  private async downloadAndExtractText(fileKey: string): Promise<string> {
    try {
      const getObjectCommand = new GetObjectCommand({
        Bucket: this._s3BucketName,
        Key: fileKey,
      });
      const response = await this._s3Client.send(getObjectCommand);
      const tempFilePath = path.join('/tmp', path.basename(fileKey));

      if (!response.Body) {
        console.error(`Failed to get object body for ${fileKey}`);
        return '';
      }

      const pipeline = promisify(stream.pipeline);
      await pipeline(
        response.Body as stream.Readable,
        createWriteStream(tempFilePath),
      );

      const loader = new PDFLoader(tempFilePath);
      const docs = await loader.load();
      const text = docs.map((doc) => doc.pageContent).join('\n');
      unlinkSync(tempFilePath);
      return text;
    } catch (err) {
      console.error(`Error downloading/extracting text from ${fileKey}:`, err);
      return '';
    }
  }

  public getDocumentText(): string {
    return this._documentText;
  }

  // private async vectorizeText(text: string) {
  //   try {
  //     const splitter = new RecursiveCharacterTextSplitter({
  //       chunkSize: 1000,
  //       chunkOverlap: 250,
  //     });
  //     const docs = await splitter.createDocuments([text]);
  //     this._vectorStore = await FaissStore.fromDocuments(
  //       docs,
  //       new OpenAIEmbeddings({ openAIApiKey: this._openaiKey }),
  //     );
  //     await this._vectorStore.save(this._faissIndexPath);
  //     console.log(`Vectorized text stored in Faiss at ${this._faissIndexPath}`);
  //   } catch (err) {
  //     console.log('Error vectorizing text: ', err);
  //   }
  // }

  // public async similaritySearch(query: string): Promise<DocumentInterface[]> {
  //   try {
  //     const docs = await this._vectorStore.similaritySearch(query);
  //     console.log(`Found ${docs.length} similar documents`);
  //     console.log(docs);
  //     return docs;
  //   } catch (err) {
  //     console.error('Error searching for similar documents:', err);
  //     return [];
  //   }
  // }
}
