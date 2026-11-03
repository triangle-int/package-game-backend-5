import { SchedulesService } from './schedules.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('SchedulesService recurring payment timing', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('persists a schedule, emits it when due, and removes it on cancellation', async () => {
    const nextExecutionTime = new Date(Date.now() + 1000);
    const schedule = {
      id: 'factoryPayment_3',
      serverId: 'server-1',
      eventName: 'factoryPayment',
      params: '3',
      nextExecutionTime,
      interval: 5000,
    };
    const prisma = {
      schedule: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(schedule),
        create: jest.fn().mockResolvedValue(schedule),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    const events = { emit: jest.fn() };
    const service = new SchedulesService(
      prisma as any,
      { get: () => 'server-1' } as any,
      {} as any,
      events as any,
    );
    await service.addSchedule(
      nextExecutionTime,
      'factoryPayment',
      'factoryPayment_3',
      5000,
      3,
    );
    expect(prisma.schedule.create).toHaveBeenCalledWith({
      data: schedule,
    });
    jest.advanceTimersByTime(999);
    expect(events.emit).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(prisma.schedule.update).toHaveBeenCalledWith({
      where: { id: 'factoryPayment_3' },
      data: { nextExecutionTime: new Date(Date.now() + 5000) },
    });
    expect(events.emit).toHaveBeenCalledWith(
      'factoryPayment',
      3,
      'factoryPayment_3',
    );
    await service.removeSchedule('factoryPayment_3');
    expect(prisma.schedule.delete).toHaveBeenCalledWith({
      where: { id: 'factoryPayment_3' },
    });
    events.emit.mockClear();
    jest.advanceTimersByTime(5000);
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('does not emit a schedule removed before its next interval', async () => {
    const prisma = {
      schedule: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'truckSchedule_7',
          eventName: 'truckSchedule',
          params: '7',
          interval: 5000,
          nextExecutionTime: new Date(Date.now() + 1000),
        }),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    const events = { emit: jest.fn() };
    const service = new SchedulesService(
      prisma as any,
      { get: () => 'server-1' } as any,
      {} as any,
      events as any,
    );
    await service.addSchedule(
      new Date(Date.now() + 1000),
      'truckSchedule',
      'truckSchedule_7',
      5000,
      7,
    );
    jest.advanceTimersByTime(1000);
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(events.emit).not.toHaveBeenCalled();
    await service.removeSchedule('truckSchedule_7');
  });
});
