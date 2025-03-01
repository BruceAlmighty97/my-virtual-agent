import { Injectable, OnModuleInit } from '@nestjs/common';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

@Injectable()
export class DocumentService implements OnModuleInit {
    private readonly _s3BucketName = 'gbh-virtual-agent-documents';
    constructor() {}

    async onModuleInit() {
        console.log('Run INIT code');
        const s3Client = new S3Client({ region: 'us-east-1' });
        try {
            const data = await s3Client.send(new ListObjectsV2Command({ Bucket: this._s3BucketName }));
            console.log('S3 bucket contents:', data.Contents);
        } catch (err) {
            console.error('Error fetching S3 bucket contents:', err);
        }
    }
}
