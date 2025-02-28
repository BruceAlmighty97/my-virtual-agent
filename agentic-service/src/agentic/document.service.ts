import { Injectable, OnModuleInit } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class DocumentService implements OnModuleInit {
    private readonly _s3BucketName = 'gbh-virtual-agent-documents';
    constructor() {}

    onModuleInit() {
        console.log('Run INIT code');
        const s3 = new AWS.S3();

        s3.listObjectsV2({ Bucket: this._s3BucketName }, (err, data) => {
            if (err) {
                console.error('Error fetching S3 bucket contents:', err);
            } else {
                console.log('S3 bucket contents:', data.Contents);
            }
        });
    }
}
