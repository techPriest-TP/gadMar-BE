import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('reports API health', () => {
    const response = controller.check();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('gadmar-api');
    expect(response.version).toBe('1.0.0');
    expect(response.timestamp).toEqual(expect.any(String));
  });
});
