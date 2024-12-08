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
  room: number;
}

export interface Message {
  username: string;
  text: string;
}

export interface Player {
  add: boolean;
  username: string;
}

export interface Rooms {
  status: "empty" | "waiting" | "starting";
  players: RoomClient[];
  roomId: number;
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
  roomId: number;
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
  list_players: (data: string[]) => void;
  list_rooms: (data: string[]) => void;
  gameMove: (data: GameMove) => void;
  hit: (data: Hit) => void;
  opponentLife: (data: OpponentLife) => void;
  endGame: (data: EndGame) => void;
}