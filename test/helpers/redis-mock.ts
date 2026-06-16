export const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(-2),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),

  reset: function (this: any) {
    this.get.mockClear();
    this.set.mockClear();
    this.setex.mockClear();
    this.del.mockClear();
    this.ttl.mockClear();
    this.incr.mockClear();
    this.expire.mockClear();

    // Restore defaults
    this.get.mockResolvedValue(null);
    this.set.mockResolvedValue('OK');
    this.setex.mockResolvedValue('OK');
    this.del.mockResolvedValue(1);
    this.ttl.mockResolvedValue(-2);
    this.incr.mockResolvedValue(1);
    this.expire.mockResolvedValue(1);
  },
};
