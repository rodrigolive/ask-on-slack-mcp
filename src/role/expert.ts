export const expertRole = {
  name: 'expert',
  askTool: {
    title: 'Ask Expert on Slack',
    description: 'Ask a human expert for technical details, verification, or specialized knowledge that requires expert confirmation. Use when you need to confirm expert details, validate technical information, or get expert opinion on complex matters. If the expert replies with another question, call this tool again. Only use this tool when you really need expert input.',
    inputDescription: 'The question to ask the human expert. Be specific and provide technical context.'
  },
  clarifyTool: {
    title: 'Clarify with Expert on Slack',
    description: 'If you called the ask_the_expert_on_slack tool but the expert did not understand your question or asked anything back, use MUST this tool to re-ask in a clearer way. Do not use this tool if you have not called ask_the_expert_on_slack before. Only use this tool when you really need expert input.',
    inputDescription: 'The clarification to ask the human expert. Be specific and provide technical context.'
  },
  acknowledgeTool: {
    title: 'Acknowledge Expert on Slack',
    description: 'If you called the ask_the_expert_on_slack tool and the expert replied, then you MUST use this tool to acknowledge the reply with a simple message like "Thanks", "Got it", "Understood", "Ok", "Will do", etc. Do not use this tool if you have not called ask_the_expert_on_slack before',
    inputDescription: 'The text to tell the expert to acknowledge receiving their reply. Keep it short.'
  }
};