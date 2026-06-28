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
    x: 360,
    y: 820,
    spriteKey: 'npc_staff',
    cueKey: 'dito',
    englishGloss: '"Dito" (Here)',
    pointDirection: 'up',
  },
  {
    id: 'guard_checkpoint',
    x: 250,
    y: 620,
    spriteKey: 'npc_guard',
    cueKey: 'kanan',
    englishGloss: '"Kanan" (Right / Go right)',
    pointDirection: 'right',
  },
  {
    id: 'vendor_shop',
    x: 470,
    y: 440,
    spriteKey: 'npc_vendor',
    cueKey: 'tuloy',
    englishGloss: '"Tuloy" (Continue / Come in)',
    pointDirection: 'up',
  },
  {
    id: 'traveler_gate',
    x: 360,
    y: 260,
    spriteKey: 'npc_traveler',
    cueKey: 'doon',
    englishGloss: '"Doon" (Over there / That way)',
    pointDirection: 'up',
  },
];
