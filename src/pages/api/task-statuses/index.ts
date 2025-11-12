import type { APIRoute } from 'astro';
import type { TaskStatusGetDto } from '@/types';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const { supabase } = locals;

  try {
    const { data, error } = await supabase
      .from('task_statuses')
      .select('id, name')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching task statuses:', error);
      throw new Error('Failed to fetch task statuses from the database.');
    }

    const taskStatuses: TaskStatusGetDto[] = data;

    return new Response(JSON.stringify(taskStatuses), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error('Server error while fetching task statuses:', err);
    return new Response(
      JSON.stringify({ message: 'An internal server error occurred.' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
