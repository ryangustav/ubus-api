export const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(-2),
  
  reset: function (this: any) {
    this.get.mockClear();
    this.set.mockClear();
    this.setex.mockClear();
    this.del.mockClear();
    this.ttl.mockClear();

    // Restore defaults
    this.get.mockResolvedValue(null);
    this.set.mockResolvedValue('OK');
    this.setex.mockResolvedValue('OK');
    this.del.mockResolvedValue(1);
    this.ttl.mockResolvedValue(-2);
  },
};
