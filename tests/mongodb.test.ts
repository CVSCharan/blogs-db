import { connectMongoDB, disconnectMongoDB } from '../src/mongodb/client';

describe('MongoDB Client', () => {
  afterAll(async () => {
    await disconnectMongoDB();
  });

  it('should have connectMongoDB function', () => {
    expect(connectMongoDB).toBeDefined();
    expect(typeof connectMongoDB).toBe('function');
  });

  it('should have disconnectMongoDB function', () => {
    expect(disconnectMongoDB).toBeDefined();
    expect(typeof disconnectMongoDB).toBe('function');
  });
});
