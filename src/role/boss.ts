export const bossRole = {
  name: 'boss',
  askTool: {
    title: 'Ask on Slack',
    description: 'Ask a human boss for information that only they would know. Use for preferences, project-specific context, local env details, non-public info, doubts. If the user replies with another question, call this tool again. Only use this tool when you really need human input.',
    inputDescription: 'The question to ask the human boss. Be specific and provide context.'
  },
  clarifyTool: {
    title: 'Clarify with the boss on Slack',
    description: 'If you called the ask_the_boss_on_slack tool but the boss did not understand your question or asked anything back, use MUST this tool to re-ask in a clearer way. Do not use this tool if you have not called ask_the_boss_on_slack before. Only use this tool when you really need human input.',
    inputDescription: 'The clarification to ask the human boss. Be specific and provide context.'
  },
  acknowledgeTool: {
    title: 'Acknowledge the boss on Slack',
    description: 'If you called the ask_the_boss_on_slack tool and the boss replied, then you MUST use this tool to acknowledge the reply with a simple message like "Thanks", "Got it", "Understood", "Ok", "Will do", etc. Do not use this tool if you have not called ask_the_boss_on_slack before',
    inputDescription: 'The text to tell the boss to acknowledge receiving their reply. Keep it short.'
  }
};