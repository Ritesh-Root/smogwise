import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadConfig } from '../src/config.js';

const REQUIRED = { GOOGLE_CLOUD_PROJECT: 'my-project', MAPS_API_KEY: 'key' };

describe('loadConfig', () => {
  it('reads required values and applies defaults', () => {
    assert.deepEqual(loadConfig(REQUIRED), {
      port: 8080,
      project: 'my-project',
      mapsApiKey: 'key',
      vertexLocation: 'global',
      model: 'gemini-3.8-flash',
    });
  });

  it('lets the environment override defaults and returns a frozen object', () => {
    const config = loadConfig({ ...REQUIRED, PORT: '3000', GEMINI_MODEL: 'other', VERTEX_LOCATION: 'us-central1' });
    assert.equal(config.port, 3000);
    assert.equal(config.model, 'other');
    assert.equal(config.vertexLocation, 'us-central1');
    assert.ok(Object.isFrozen(config));
  });

  it('names every missing or invalid setting in one error', () => {
    assert.throws(
      () => loadConfig({ PORT: 'abc' }),
      (error) => {
        assert.match(error.message, /GOOGLE_CLOUD_PROJECT/);
        assert.match(error.message, /MAPS_API_KEY/);
        assert.match(error.message, /PORT/);
        return true;
      },
    );
  });

  it('rejects a port outside the valid range', () => {
    assert.throws(() => loadConfig({ ...REQUIRED, PORT: '70000' }), /PORT/);
  });
});
