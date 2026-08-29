import { resolveRequestId } from './request-id.util';

describe('resolveRequestId', () => {
  it('generates a UUID when no incoming request ID is provided', () => {
    const requestId = resolveRequestId(undefined);

    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('accepts a valid incoming UUID request ID', () => {
    const incomingRequestId = '550E8400-E29B-41D4-A716-446655440000';

    expect(resolveRequestId(incomingRequestId)).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('rejects unsafe or malformed incoming request IDs', () => {
    const generatedRequestId = resolveRequestId('not-a-valid-request-id');

    expect(generatedRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(generatedRequestId).not.toBe('not-a-valid-request-id');
  });
});
