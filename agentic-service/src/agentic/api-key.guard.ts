import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly _apiKey: string;

  constructor(private _configService: ConfigService) {
    this._apiKey = this._configService
      .get<string>('MY_VIRTUAL_AGENT_API_KEY') || '';
  }
  
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    console.log(`API Key: ${apiKey}`);

    if (!apiKey || apiKey !== this._apiKey) {
      throw new UnauthorizedException('API Key is missing');
    }

    return true;
  }
}
