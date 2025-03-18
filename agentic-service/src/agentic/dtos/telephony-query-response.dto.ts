import { TelephonyQueryRequest } from "./telephony-query-request.dto";

export interface TelephonyQueryResponse extends TelephonyQueryRequest {
    response: string;
}