import { Human } from './types.ts'

export class NoopHuman implements Human {
  async ask(question: string): Promise<string> {
    return Promise.reject(
      new Error(
        'No Human client configured. Provide Slack credentials to enable ask_on_slack.'
      )
    )
  }
}

