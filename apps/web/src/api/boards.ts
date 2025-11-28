import { Board } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export async function fetchBoards(ownerId: string): Promise<Board[]> {
  const params = new URLSearchParams({ ownerId });
  const response = await fetch(`${API_URL}/boards?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch boards (${response.status})`);
  }
  return response.json();
}
