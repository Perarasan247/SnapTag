export const CHECKLIST_TEMPLATES = [
  {
    id: 'retraining',
    name: 'Retraining',
    icon: 'reload',
    items: [
      { id: 'rt_1', label: 'Door Open & Close' },
      { id: 'rt_2', label: 'Toilet Lid Open & Close' },
      { id: 'rt_3', label: 'Toilet Seat Open & Close' },
      { id: 'rt_4', label: 'Toilet Flush Button' },
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: 'lightning-bolt-outline',
    items: [
      { id: 'el_1', label: 'Power Switch Test' },
      { id: 'el_2', label: 'Circuit Breaker Check' },
      { id: 'el_3', label: 'Socket Inspection' },
      { id: 'el_4', label: 'Earthing Verification' },
    ],
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: 'pipe',
    items: [
      { id: 'pl_1', label: 'Water Pressure Check' },
      { id: 'pl_2', label: 'Pipe Leak Inspection' },
      { id: 'pl_3', label: 'Drain Flow Test' },
      { id: 'pl_4', label: 'Valve Operation' },
    ],
  },
  {
    id: 'structural',
    name: 'Structural',
    icon: 'office-building-outline',
    items: [
      { id: 'st_1', label: 'Wall Crack Inspection' },
      { id: 'st_2', label: 'Ceiling Check' },
      { id: 'st_3', label: 'Floor Condition' },
      { id: 'st_4', label: 'Window Frame Integrity' },
      { id: 'st_5', label: 'Door Frame Alignment' },
    ],
  },
  {
    id: 'safety',
    name: 'Safety',
    icon: 'shield-check-outline',
    items: [
      { id: 'sf_1', label: 'Fire Extinguisher Check' },
      { id: 'sf_2', label: 'Smoke Detector Test' },
      { id: 'sf_3', label: 'Emergency Exit Clear' },
      { id: 'sf_4', label: 'First Aid Kit Present' },
    ],
  },
  {
    id: 'toilet_mapping',
    name: 'Toilet Room Mapping',
    icon: 'floor-plan',
    items: [
      { id: 'tm_1', label: 'Door — width, swing direction, threshold photo' },
      { id: 'tm_2', label: 'Full room photo (wide-angle from doorway)' },
      { id: 'tm_3', label: 'Toilet — position, flush type, cistern photo' },
      { id: 'tm_4', label: 'Sink — position, tap type, under-sink clearance photo' },
      { id: 'tm_5', label: 'Floor drain location + any step or level change' },
    ],
  },
];

export const getTemplateById = (id) =>
  CHECKLIST_TEMPLATES.find((t) => t.id === id);

export const getTemplatesByIds = (ids = []) =>
  CHECKLIST_TEMPLATES.filter((t) => ids.includes(t.id));
