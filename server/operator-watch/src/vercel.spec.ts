import { apiPath } from './vercel';

describe('apiPath', () => {
  it('strips the /api/ow prefix from the original URL', () => {
    expect(apiPath('/api/ow/workspace/accounts?limit=6')).toBe('/workspace/accounts?limit=6');
    expect(apiPath('/api/ow')).toBe('/');
  });

  it('rebuilds the path from the rewrite target', () => {
    expect(apiPath('/api/ow?path=workspace/accounts/A%201&limit=6')).toBe('/workspace/accounts/A%201?limit=6');
    expect(apiPath('/api/ow?path=internal/tick')).toBe('/internal/tick');
  });
});
