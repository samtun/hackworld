export { BaseDungeon } from './BaseDungeon';
export { Lobby } from './Lobby';
export { Dungeon1 } from './Dungeon1';
export { Dungeon2 } from './Dungeon2';

// Registry of all available dungeons
import { Dungeon1 } from './Dungeon1';
import { Dungeon2 } from './Dungeon2';

export const AVAILABLE_DUNGEONS = [
    Dungeon1,
    Dungeon2
];
