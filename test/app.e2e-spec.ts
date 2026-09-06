import request from 'supertest';

describe('GadMar API (e2e)', () => {
  jest.setTimeout(30000);

  const api = request(process.env.E2E_BASE_URL ?? 'http://localhost:4500');
  let adminToken: string;
  let brandOwnerToken: string;
  let customerToken: string;

  const login = async (
    email: string,
    password: string,
    platform?: 'dashboard',
  ): Promise<string> => {
    const url = platform
      ? `/api/v1/auth/login?platform=${platform}`
      : '/api/v1/auth/login';

    const response = await api
      .post(url)
      .send({ email, password })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toEqual(expect.any(String));

    return response.body.data.accessToken;
  };

  beforeAll(async () => {
    customerToken = await login('john@example.com', 'user123');
    brandOwnerToken = await login('owner@apple.com', 'owner123', 'dashboard');
    adminToken = await login('admin@gadmar.com', 'admin123', 'dashboard');
  });

  it('reports API health', async () => {
    const response = await api.get('/api/v1/health').expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('gadmar-api');
  });

  it('rejects customers from the administration dashboard login platform', async () => {
    await api
      .post('/api/v1/auth/login?platform=dashboard')
      .send({ email: 'john@example.com', password: 'user123' })
      .expect(401);
  });

  it('returns public products for the marketplace', async () => {
    const response = await api
      .get('/api/v1/products')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('returns the customer dashboard summary', async () => {
    const response = await api
      .get('/api/v1/customers/dashboard')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(response.body.user).toBeDefined();
    expect(response.body.cards).toBeDefined();
    expect(Array.isArray(response.body.recentPurchases)).toBe(true);
    expect(Array.isArray(response.body.recentCredits)).toBe(true);
    expect(Array.isArray(response.body.recentWithdrawals)).toBe(true);
  });

  it('returns the brand owner dashboard summary', async () => {
    const response = await api
      .get('/api/v1/brand-owners/dashboard')
      .set('Authorization', `Bearer ${brandOwnerToken}`)
      .expect(200);

    expect(Array.isArray(response.body.brands)).toBe(true);
    expect(response.body.cards).toBeDefined();
    expect(response.body.directConfirmation).toBeDefined();
    expect(Array.isArray(response.body.recentPurchaseIntents)).toBe(true);
    expect(Array.isArray(response.body.recentCommissions)).toBe(true);
  });

  it('returns the super admin dashboard summary', async () => {
    const response = await api
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.adminUserId).toEqual(expect.any(String));
    expect(response.body.cards).toBeDefined();
    expect(response.body.queues).toBeDefined();
    expect(Array.isArray(response.body.recentPurchaseIntents)).toBe(true);
    expect(Array.isArray(response.body.recentWithdrawals)).toBe(true);
    expect(Array.isArray(response.body.recentBrandRequests)).toBe(true);
  });

  it('returns the current brand owner brands', async () => {
    const response = await api
      .get('/api/v1/brands/my-brands')
      .set('Authorization', `Bearer ${brandOwnerToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('returns the current customer transactions', async () => {
    const response = await api
      .get('/api/v1/transaction-intents/my-transactions')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('returns the current customer credit summary and withdrawals', async () => {
    const creditSummary = await api
      .get('/api/v1/rewards/my-credit-summary')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(creditSummary.body.withdrawableCredits).toBeDefined();
    expect(creditSummary.body.pendingCredits).toBeDefined();

    const withdrawals = await api
      .get('/api/v1/credit-withdrawals/my-withdrawals')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(Array.isArray(withdrawals.body)).toBe(true);
  });
});
