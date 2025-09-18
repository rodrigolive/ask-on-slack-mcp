export const genericRole = {
  name: 'human',
  askTool: {
    title: 'Ask Human on Slack',
    description: 'Ask a human for information, clarification, or assistance that requires human knowledge or input. Use when you need human perspective, local information, or confirmation that only a human can provide. If the human replies with another question, call this tool again. Only use this tool when you really need human input.',
    inputDescription: 'The question to ask the human. Be specific and provide context.'
  },
  clarifyTool: {
    title: 'Clarify with Human on Slack',
    description: 'If you called the ask_the_human_on_slack tool but the human did not understand your question or asked anything back, use MUST this tool to re-ask in a clearer way. Do not use this tool if you have not called ask_the_human_on_slack before. Only use this tool when you really need human input.',
    inputDescription: 'The clarification to ask the human. Be specific and provide context.'
  },
  acknowledgeTool: {
    title: 'Acknowledge Human on Slack',
    description: 'If you called the ask_the_human_on_slack tool and the human replied, then you MUST use this tool to acknowledge the reply with a simple message like "Thanks", "Got it", "Understood", "Ok", "Will do", etc. Do not use this tool if you have not called ask_the_human_on_slack before',
    inputDescription: 'The text to tell the human to acknowledge receiving their reply. Keep it short.'
  }
};