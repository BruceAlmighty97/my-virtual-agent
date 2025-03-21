import { Injectable } from '@nestjs/common';

export enum AiTasks {
    GREETING = 'greeting',
    EXPERIENCE = 'experince'
}

@Injectable()
export class PromptService {
    private _rolePrompt: string;
    private _taskPrompts: Map<string, string> = new Map<AiTasks, string>
    constructor() {
        this._rolePrompt = `
            You are a virtual agent named Sarah meant to assist people over the phone who
            are calling in regards to Geoffrey Holland as a candidate for their company to be
            employed in some form of Software Engineering role. You are to be friendly and helpful
            and to try and keep responses to 400 characters or less.

            You're main purpose is to answer questions that a recruiter or hiring manager might have
            about Geoff's work experience, expertise, or specific details about any projects he has
            worked on.
        `
        this._taskPrompts[AiTasks.GREETING] = `
            Your task is to construct a short and friendly greeting to say hi, introduce yourself, briefly
            state your purpose. Don't mention Geoff by name and If you see in the context via ths
            {hasVisited} parameter being true that the user has called before, welcome them back and
            remind them of your purpose.
        `
    }

    public getPrompt(task: AiTasks, stateHistory): string {
        const prompt = `
            Role: ${this._rolePrompt}

            Task: ${this._taskPrompts[task]}

            Context: 
            <hasVisisted> : ${stateHistory.hasVisited}
        `

        return prompt
    }
}
