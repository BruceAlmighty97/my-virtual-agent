import axios from 'axios';

export interface AgenticRequest {
    input: string;
    fromNumber: string;
}

export interface AgenticResponse extends AgenticRequest {
    response: string;
}



export class AgenticApiService {
    private _agenticBaseUrl: string;
    private _client: Axios.AxiosInstance;
    private _apiKey: string;
    
    constructor() {
        this._agenticBaseUrl = process.env.AGENTIC_BASE_URL || '';
        this._apiKey = process.env.MY_VIRTUAL_AGENT_API_KEY || '';
        this._client = axios.create({
            baseURL: this._agenticBaseUrl
        });
    }

    public async getAgenticResponse(request: AgenticRequest): Promise<AgenticResponse> {
        const response = await this._client.post<AgenticResponse>(
            `${this._agenticBaseUrl}/agentic/telephony-request`,
            request,
            {
                headers: {
                    'x-api-key': this._apiKey
                }
            }
        );
        console.log(`Response from agentic api...` , response.data);
        return {
            input: request.input,
            fromNumber: request.fromNumber,
            response: response.data.response
        }
    }
}