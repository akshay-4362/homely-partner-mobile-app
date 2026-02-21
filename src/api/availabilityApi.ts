import client from './client';

export interface HourlySlot {
  hour: number;
  available: boolean;
}

export interface DaySchedule {
  dayOfWeek: number;
  slots: HourlySlot[];
}

export interface AvailabilityStats {
  weeklyHours: number;
  monthlyHours: number;
  needsUpdate: boolean;
  minimumRequired: number;
  percentageOfMinimum: number;
}

export const availabilityApi = {
  getStats: async (): Promise<AvailabilityStats> => {
    const { data } = await client.get('/availability/stats');
    return data.data || data;
  },

  initializeSchedule: async () => {
    const { data } = await client.post('/availability/initialize');
    return data.data || data;
  },

  updateWeeklySchedule: async (weeklySchedule: DaySchedule[]) => {
    const { data } = await client.put('/availability/weekly-schedule', { weeklySchedule });
    return data.data || data;
  },

  batchUpdateDay: async (
    dayOfWeek: number,
    startHour: number,
    endHour: number,
    available: boolean
  ) => {
    const { data } = await client.post('/availability/batch-update-day', {
      dayOfWeek,
      startHour,
      endHour,
      available,
    });
    return data.data || data;
  },

  setDateOverride: async (date: string, slots: HourlySlot[]) => {
    const { data } = await client.post('/availability/date-override', { date, slots });
    return data.data || data;
  },

  removeDateOverride: async (date: string) => {
    const { data } = await client.delete(`/availability/date-override/${date}`);
    return data.data || data;
  },

  getAvailabilityForDate: async (date: string): Promise<HourlySlot[]> => {
    const { data } = await client.get(`/availability/date/${date}`);
    const result = data.data || data;
    return result.slots || result;
  },

  copyWeekPattern: async (sourceStartDate: string, targetStartDate: string) => {
    const { data } = await client.post('/availability/copy-week', {
      sourceStartDate,
      targetStartDate,
    });
    return data.data || data;
  },
};
