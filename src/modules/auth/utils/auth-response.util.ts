import type { Response } from 'express';

export function applyNoStoreCacheControl(response: Response): void {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Pragma', 'no-cache');
}
