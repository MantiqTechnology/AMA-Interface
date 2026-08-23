export default defineEventHandler(() => {
  return {
    status: 'success',
    data: [
      { id: 'USR-001', name: 'Capt. Hery Mantiq', score: 82, level: 'High' },
      { id: 'USR-002', name: 'Capt. Budi', score: 25, level: 'Low' },
      { id: 'USR-003', name: 'FO Siska', score: 45, level: 'Medium' }
    ]
  }
})