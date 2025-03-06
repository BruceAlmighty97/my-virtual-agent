import { IsNotEmpty, IsString } from 'class-validator';

export class SimpleQueryRequestDto {
  @IsString()
  @IsNotEmpty()
  inputText: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
