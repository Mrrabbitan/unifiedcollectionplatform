import { requestClient } from '#/api/request';

export interface DagMenuItem {
  taskType: string;
  taskCategory: string;
  collection: boolean;
}

export async function getDagMenu(): Promise<DagMenuItem[]> {
  return requestClient.get('/favourite/taskTypes');
}
