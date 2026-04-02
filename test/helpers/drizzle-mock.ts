export const mockDrizzle = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([]),
  mockResolvedValue: function (this: any, data: any) {
    // Override the final chainable method to return specific data
    // Handles both select/delete returning arrays or plain values
    this._mockData = data;
    const returnMock = jest.fn().mockResolvedValue(data);
    this.where = returnMock;
    this.returning = returnMock;
    this.limit = returnMock;
    return this;
  },
  reset: function (this: any) {
    this.select.mockClear();
    this.from.mockClear();
    this.leftJoin.mockClear();
    this.innerJoin.mockClear();
    this.where.mockClear();
    this.limit.mockClear();
    this.orderBy.mockClear();
    this.insert.mockClear();
    this.values.mockClear();
    this.update.mockClear();
    this.set.mockClear();
    this.delete.mockClear();
    this.returning.mockClear();
    
    // Re-setup chaining defaults
    this.select.mockReturnThis();
    this.from.mockReturnThis();
    this.leftJoin.mockReturnThis();
    this.innerJoin.mockReturnThis();
    this.where.mockReturnThis();
    this.limit.mockReturnThis();
    this.orderBy.mockReturnThis();
    this.insert.mockReturnThis();
    this.values.mockReturnThis();
    this.update.mockReturnThis();
    this.set.mockReturnThis();
    this.delete.mockReturnThis();
    this.returning.mockResolvedValue([]);
  },
};
