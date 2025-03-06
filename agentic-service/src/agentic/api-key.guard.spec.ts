import { ApiKeyGuard } from './api-key.guard';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let configService: ConfigService;
  let context: ExecutionContext;
  const mockApiKey = 'valid-api-key';

  beforeEach(() => {
    configService = { get: jest.fn() } as unknown as ConfigService;
    (configService.get as jest.Mock).mockReturnValue(mockApiKey);
    guard = new ApiKeyGuard(configService);
    context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn(),
      }),
    } as unknown as ExecutionContext;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true when API key is correct', () => {
    const request = { headers: { 'x-api-key': mockApiKey } };
    (context.switchToHttp().getRequest as jest.Mock).mockReturnValue(request);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException when API key is missing', () => {
    (configService.get as jest.Mock).mockReturnValue('valid-api-key');

    const request = { headers: {} };
    (context.switchToHttp().getRequest as jest.Mock).mockReturnValue(request);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when API key is incorrect', () => {
    (configService.get as jest.Mock).mockReturnValue('valid-api-key');

    const request = { headers: { 'x-api-key': 'invalid-api-key' } };
    (context.switchToHttp().getRequest as jest.Mock).mockReturnValue(request);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
