export type NapCycle = {
  actions: string[];
  cycle_start: string | null;
};

/** The 90-day cycle rotates its actions into one task per week. */
export function weeklyNapTask(cycle: NapCycle | null): {
  week: number;
  task: string;
} | null {
  if (!cycle || !cycle.actions.length) return null;
  const week = cycle.cycle_start
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(cycle.cycle_start).getTime()) / (7 * 86400000)
        )
      )
    : 0;
  return { week: week + 1, task: cycle.actions[week % cycle.actions.length] };
}
