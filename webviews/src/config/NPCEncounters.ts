/**
 * NPC Encounter configuration.
 *
 * Defines the positions, sprite graphics, and Tagalog audio instructions
 * for all NPCs placed along the airport corridor.
 */
export interface NPCEncounter {
  id: string;
  x: number;
  y: number;
  spriteKey: string;
  cueKey: string; // The Tagalog audio cue to play
  englishGloss: string; // Brief hint shown when speaking
  pointDirection?: 'left' | 'right' | 'up' | 'down';
}

export const NPC_ENCOUNTERS: NPCEncounter[] = [
  {
    id: 'staff_start',
    x: 450,
    y: 840,
    spriteKey: 'npc_staff',
    cueKey: 'dito',
    englishGloss: '"Dito" (Here)',
    pointDirection: 'right',
  },
  {
    id: 'guard_checkpoint',
    x: 900,
    y: 790,
    spriteKey: 'npc_guard',
    cueKey: 'kanan',
    englishGloss: '"Kanan" (Right / Go right)',
    pointDirection: 'right',
  },
  {
    id: 'vendor_shop',
    x: 1350,
    y: 860,
    spriteKey: 'npc_vendor',
    cueKey: 'tuloy',
    englishGloss: '"Tuloy" (Continue / Come in)',
    pointDirection: 'right',
  },
  {
    id: 'traveler_gate',
    x: 1800,
    y: 810,
    spriteKey: 'npc_traveler',
    cueKey: 'doon',
    englishGloss: '"Doon" (Over there / That way)',
    pointDirection: 'right',
  },
];
