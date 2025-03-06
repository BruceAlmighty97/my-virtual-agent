export class SimpleQueryResponseDto {
  inputText: string;
  outputText: string;
  sessionId: string;

  constructor(inputText: string, outputText: string, sessionId: string) {
    this.inputText = inputText;
    this.outputText = outputText;
    this.sessionId = sessionId;
  }
}
