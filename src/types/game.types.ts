export type CharacterSides = "down" | "left" | "right" | "up";

export interface RoomClient {
  client_id: string;
  username: string;
  // email?: string;
  // password?: string;
}

export interface JoinRoom {
  client_id: string;
  username: string;
  roomId: string;
}

export interface Message {
  username: string;
  text: string;
  hour: string;
}

export interface Player {
  add: boolean;
  username: string;
}

export interface Rooms {
  status: "empty" | "waiting" | "starting";
  players: RoomClient[];
  roomId: string;
}

export interface GameMove {
  playerId: string;
  side: CharacterSides;
  xAxis: number;
  yAxis: number;
  opponentId: string;
}

export interface Hit {
  damage: number;
  opponentId: string;
}

export interface OpponentLife {
  life: number;
  opponentId: string;
}

export interface EndGame {
  winner: string;
  opponentId: string;
  roomId: string;
}

export interface ServerToClientEvents {
  // On
  message: (data: Message) => void;
  join_room: (data: JoinRoom) => void;
  list_players: (data: Player) => void;
  status_room: (data: string) => void;
  list_rooms: (data: Rooms[]) => void;
  gameMove: (data: GameMove) => void;
  hit: (data: Hit) => void;
  opponentLife: (data: OpponentLife) => void;
  endGame: (data: EndGame) => void;
}

export interface ClientToServerEvents {
  // Emit
  message: (data: Message) => void;
  join_lobby: (data: RoomClient) => void;
  join_room: (data: JoinRoom) => void;
  list_players: () => string[];
  list_rooms: () => Rooms[];
  list_messages: () => Message[];
  gameMove: (data: GameMove) => void;
  hit: (data: Hit) => void;
  opponentLife: (data: OpponentLife) => void;
  endGame: (data: EndGame) => void;
}