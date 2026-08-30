import { type Response } from 'express';
import { applyNoStoreCacheControl } from './auth-response.util';

describe('applyNoStoreCacheControl', () => {
  it('sets no-store cache headers on auth token responses', () => {
    const headers = new Map<string, string>();
    const response = {
      setHeader(name: string, value: string): void {
        headers.set(name, value);
      },
    } as Response;

    applyNoStoreCacheControl(response);

    expect(headers.get('Cache-Control')).toBe('no-store');
    expect(headers.get('Pragma')).toBe('no-cache');
  });
});
