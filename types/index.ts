export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  completedAt?: Date;
  priority: number;
  urgencyScore: number;
  category?: string;
  course?: string;
  source: string;
  sourceId?: string;
  sourceUrl?: string;
  aiSummary?: string;
  aiProcessed: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Integration {
  id: string;
  userId: string;
  provider: 'canvas' | 'gmail' | 'calendar' | 'slack' | 'discord' | 'notion';
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  metadata?: any;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyBrief {
  greeting: string;
  motivationalMessage: string;
  tasksDueToday: number;
  tasksCompletedToday: number;
  completionPercentage: number;
  priorityTasks: Task[];
}

export interface TaskFilter {
  priority?: 'high' | 'medium' | 'low';
  dueDate?: 'today' | 'week' | 'overdue';
  completed?: boolean;
  source?: string;
  course?: string;
}

export type IntegrationType = 'canvas' | 'gmail' | 'calendar' | 'slack' | 'discord' | 'notion';
