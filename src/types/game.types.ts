export interface PlayerInfo {
  client_id: string;
  username: string;
  email?: string;
  password?: string;
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

export interface RoomClient extends PlayerInfo {
  client_id: string;
}

export interface Rooms {
  status: 'empty' | 'waiting' | 'starting';
  players: PlayerInfo[];
  roomId: number;
}

export interface GameMoveData {
  opponentId: string;
}