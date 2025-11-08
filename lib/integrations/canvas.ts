/**
 * Canvas LMS Integration
 * This file contains helper functions for fetching data from Canvas LMS
 */

import axios from 'axios';
import { summarizeContent, calculatePriorityScore } from '@/lib/ai/cohere';
import prisma from '@/lib/prisma';

interface CanvasAssignment {
  id: number;
  name: string;
  description?: string;
  due_at?: string;
  course_id: number;
  html_url: string;
  points_possible?: number;
  submission?: {
    submitted_at?: string;
    workflow_state?: string;
  };
}

interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
}

export class CanvasIntegration {
  private accessToken: string;
  private canvasUrl: string;

  constructor(accessToken: string, canvasUrl?: string) {
    this.accessToken = accessToken;
    this.canvasUrl = canvasUrl || process.env.CANVAS_API_URL || 'https://canvas.instructure.com';
  }

  /**
   * Fetch all courses for the current user
   */
  async getCourses(): Promise<CanvasCourse[]> {
    try {
      const response = await axios.get(`${this.canvasUrl}/api/v1/courses`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        params: {
          enrollment_state: 'active',
          per_page: 100,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Canvas courses:', error);
      throw error;
    }
  }

  /**
   * Fetch assignments for a specific course
   */
  async getCourseAssignments(courseId: number): Promise<CanvasAssignment[]> {
    try {
      const response = await axios.get(
        `${this.canvasUrl}/api/v1/courses/${courseId}/assignments`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          params: {
            include: ['submission'],
            per_page: 100,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error fetching assignments for course ${courseId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch all assignments across all courses
   */
  async getAllAssignments(): Promise<CanvasAssignment[]> {
    const courses = await this.getCourses();
    const allAssignments: CanvasAssignment[] = [];

    for (const course of courses) {
      const assignments = await this.getCourseAssignments(course.id);
      allAssignments.push(...assignments);
    }

    return allAssignments;
  }

  /**
   * Sync Canvas assignments to database
   */
  async syncToDatabase(userId: string): Promise<void> {
    try {
      const courses = await this.getCourses();
      const courseMap = new Map(courses.map(c => [c.id, c]));

      for (const course of courses) {
        const assignments = await this.getCourseAssignments(course.id);

        for (const assignment of assignments) {
          // Skip if already submitted
          if (assignment.submission?.workflow_state === 'submitted') {
            continue;
          }

          // Check if task already exists
          const existingTask = await prisma.task.findFirst({
            where: {
              userId,
              source: 'canvas',
              sourceId: assignment.id.toString(),
            },
          });

          // Prepare task data
          const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;

          // Use AI to summarize and prioritize
          let aiSummary = assignment.name;
          let priority = 5;
          let urgencyScore = 5;

          if (assignment.description) {
            try {
              aiSummary = await summarizeContent({
                text: assignment.description,
                context: `Assignment for ${course.name}`,
              });
            } catch (error) {
              console.error('Error summarizing assignment:', error);
            }
          }

          if (dueDate) {
            try {
              const priorityData = await calculatePriorityScore({
                title: assignment.name,
                description: assignment.description,
                dueDate,
                course: course.name,
                source: 'canvas',
              });
              priority = priorityData.priority;
              urgencyScore = priorityData.urgencyScore;
            } catch (error) {
              console.error('Error calculating priority:', error);
            }
          }

          const taskData = {
            userId,
            title: assignment.name,
            description: assignment.description,
            dueDate,
            priority,
            urgencyScore,
            category: 'assignment',
            course: course.name,
            source: 'canvas',
            sourceId: assignment.id.toString(),
            sourceUrl: assignment.html_url,
            aiSummary,
            aiProcessed: true,
            metadata: {
              pointsPossible: assignment.points_possible,
              courseId: course.id,
              courseCode: course.course_code,
            },
          };

          if (existingTask) {
            // Update existing task
            await prisma.task.update({
              where: { id: existingTask.id },
              data: taskData,
            });
          } else {
            // Create new task
            await prisma.task.create({
              data: taskData,
            });
          }
        }
      }

      // Update integration last synced time
      await prisma.integration.updateMany({
        where: {
          userId,
          provider: 'canvas',
        },
        data: {
          lastSyncedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error syncing Canvas assignments:', error);
      throw error;
    }
  }
}

/**
 * Helper function to sync Canvas for a user
 */
export async function syncCanvasForUser(userId: string): Promise<void> {
  const integration = await prisma.integration.findFirst({
    where: {
      userId,
      provider: 'canvas',
      isConnected: true,
    },
  });

  if (!integration || !integration.accessToken) {
    throw new Error('Canvas integration not connected');
  }

  const canvas = new CanvasIntegration(integration.accessToken);
  await canvas.syncToDatabase(userId);
}
