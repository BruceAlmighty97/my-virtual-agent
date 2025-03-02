import { Controller, Get } from '@nestjs/common';
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

@Controller()
export class AppController {
  constructor() {}

  @Get()
  healthCheck(): string {
    return "ok";
  }

  @Get('/email')
  async email(): Promise<string> {
    const sesClient = new SESClient({ region: "us-east-1" });
    const command:SendEmailCommand = new SendEmailCommand({
      Source: 'geoff.dev.74@gmail.com',
      Destination: {
        ToAddresses: ['geoff.holland74@gmail.com']
      },
      Message: {
        Subject: { Data: 'This is from my local app' },
        Body: {
          Text: {Data: 'Hello Geoffrey!!!!'}
        }
      }
    });
    const response = await sesClient.send(command);
    return 'ok'
  }
}
