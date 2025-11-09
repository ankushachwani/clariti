import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || '',
});

export interface SummarizationInput {
  text: string;
  context?: string;
}

export interface PrioritizationInput {
  title: string;
  description?: string;
  dueDate?: Date;
  course?: string;
  source: string;
}

export async function summarizeContent(input: SummarizationInput): Promise<string> {
  try {
    const message = `Summarize the following content into a single, actionable task description (1-2 sentences maximum):

${input.context ? `Context: ${input.context}\n\n` : ''}Content:
${input.text}

Summary:`;

    const response = await cohere.chat({
      model: 'command-r7b-12-2024',
      message: message,
      maxTokens: 100,
      temperature: 0.3,
    });

    return response.text.trim();
  } catch (error) {
    console.error('Cohere summarization error:', error);
    return input.text.substring(0, 200) + '...';
  }
}

export async function calculatePriorityScore(input: PrioritizationInput): Promise<{
  priority: number;
  urgencyScore: number;
  reasoning: string;
}> {
  try {
    const now = new Date();
    const daysUntilDue = input.dueDate
      ? Math.ceil((input.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const message = `Analyze this task and provide a priority score (0-10) and urgency score (1-10):

Task: ${input.title}
${input.description ? `Description: ${input.description}` : ''}
${input.course ? `Course: ${input.course}` : ''}
${daysUntilDue !== null ? `Days until due: ${daysUntilDue}` : 'No due date'}
Source: ${input.source}

Consider:
- Deadline proximity (high weight)
- Academic importance (medium weight)
- Task type (assignment > meeting > reading)

Respond in this exact format:
Priority: [0-10]
Urgency: [1-10]
Reasoning: [brief explanation]`;

    const response = await cohere.chat({
      model: 'command-r7b-12-2024',
      message: message,
      maxTokens: 150,
      temperature: 0.3,
    });

    const result = response.text.trim();
    const priorityMatch = result.match(/Priority:\s*(\d+)/);
    const urgencyMatch = result.match(/Urgency:\s*(\d+)/);
    const reasoningMatch = result.match(/Reasoning:\s*(.+)/s);

    const priority = priorityMatch ? Math.min(10, Math.max(0, parseInt(priorityMatch[1]))) : 5;
    const urgencyScore = urgencyMatch ? Math.min(10, Math.max(1, parseInt(urgencyMatch[1]))) : 5;
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'No reasoning provided';

    return { priority, urgencyScore, reasoning };
  } catch (error) {
    console.error('Cohere priority calculation error:', error);

    // Fallback calculation based on due date
    const now = new Date();
    const daysUntilDue = input.dueDate
      ? Math.ceil((input.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    let priority = 5;
    let urgencyScore = 5;

    if (daysUntilDue <= 1) {
      priority = 10;
      urgencyScore = 10;
    } else if (daysUntilDue <= 3) {
      priority = 8;
      urgencyScore = 9;
    } else if (daysUntilDue <= 7) {
      priority = 6;
      urgencyScore = 7;
    }

    return {
      priority,
      urgencyScore,
      reasoning: 'Calculated based on deadline proximity',
    };
  }
}

export async function generateDailyMotivation(): Promise<string> {
  const motivations = [
    'Lock in!',
    'Focus up!',
    'You got this!',
    'Stay sharp!',
    'Crush it today!',
    'Make it count!',
    'Own the day!',
    'Stay locked!',
  ];

  return motivations[Math.floor(Math.random() * motivations.length)];
}

export async function prioritizeTask(task: any): Promise<{
  priority: number;
  urgencyScore: number;
  reasoning: string;
}> {
  return calculatePriorityScore({
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    course: task.course,
    source: task.source,
  });
}

export async function generateWorkRoadmap(tasks: any[]): Promise<string> {
  try {
    if (tasks.length === 0) {
      return "You're all caught up! No urgent tasks at the moment. Great job staying on top of things! 🎉";
    }

    const taskList = tasks.map((task, index) => {
      const daysUntil = task.dueDate 
        ? Math.ceil((new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 'No deadline';
      return `${index + 1}. ${task.title} (Due: ${daysUntil === 'No deadline' ? daysUntil : `${daysUntil} days`})`;
    }).join('\n');

    const message = `You are a productivity coach for a college student. Based on these upcoming tasks, provide a brief, motivating roadmap (2-3 sentences) on how to tackle their work efficiently:

${taskList}

Provide practical advice on prioritization and time management. Keep it concise, actionable, and motivating.`;

    const response = await cohere.chat({
      model: 'command-r7b-12-2024',
      message: message,
      maxTokens: 150,
      temperature: 0.7,
    });

    return response.text.trim();
  } catch (error) {
    console.error('Cohere roadmap generation error:', error);
    return "Focus on your highest priority tasks first. Break them down into smaller chunks, and tackle them one at a time. You've got this!";
  }
}
