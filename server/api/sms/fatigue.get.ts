export default defineEventHandler(() => {
  return {
    status: 'success',
    data: [
      { id: 'EMP-001', name: 'Capt. R. Budi Santoso', score: 32, level: 'Low', dutyHoursToday: 4.5 },
      { id: 'EMP-003', name: 'FO Jeremy Pattiasina', score: 78, level: 'High', dutyHoursToday: 7.8 },
      { id: 'EMP-004', name: 'FO Melky Kogoya', score: 55, level: 'Medium', dutyHoursToday: 6.0 }
    ]
  };
});