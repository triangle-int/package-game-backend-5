import { TaskService } from './task.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('TaskService durable timeout delivery', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('persists a timeout and emits the event only after removing it', async () => {
    const executionTime = new Date(Date.now() + 1000);
    const timeout = {
      id: 1,
      eventName: 'truckArrived',
      params: JSON.stringify(11),
      executionTime,
    };
    const order: string[] = [];
    const prisma = {
      timeout: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue(timeout),
        delete: jest.fn(async () => {
          order.push('delete');
        }),
      },
    };
    const events = {
      emit: jest.fn(() => order.push('emit')),
    };
    const config = { get: jest.fn().mockReturnValue('server-1') };
    const service = new TaskService(prisma as any, events as any, config as any);
    await service.addTimeout(executionTime, 'truckArrived', 11);

    expect(prisma.timeout.create).toHaveBeenCalledWith({
      data: {
        eventName: 'truckArrived',
        params: '11',
        executionTime,
        serverId: 'server-1',
      },
    });
    jest.advanceTimersByTime(999);
    expect(events.emit).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(order).toEqual(['delete', 'emit']);
    expect(events.emit).toHaveBeenCalledWith('truckArrived', 11);
  });

  it('restores pending timeouts only for the current server', async () => {
    const timeout = {
      id: 2,
      eventName: 'factoryPayment',
      params: '3',
      executionTime: new Date(Date.now() + 1000),
    };
    const prisma = {
      timeout: {
        findMany: jest.fn().mockResolvedValue([timeout]),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    const events = { emit: jest.fn() };
    const service = new TaskService(
      prisma as any,
      events as any,
      { get: () => 'server-1' } as any,
    );
    await (service as any).init();
    expect(prisma.timeout.findMany).toHaveBeenCalledWith({
      where: { serverId: 'server-1' },
    });
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    jest.advanceTimersByTime(1000);
    expect(prisma.timeout.delete).toHaveBeenCalledWith({ where: { id: 2 } });
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(events.emit).toHaveBeenCalledWith('factoryPayment', 3);
  });
});
