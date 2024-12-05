import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  PlayerInfo,
  JoinRoom,
  Message,
  Rooms,
  GameMoveData,
} from '../types/game.types';
import { Logger } from '@nestjs/common';

@WebSocketGateway(8800, {
  cors: {
    origin: 'http://localhost:3000',
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(GameGateway.name);

  private clientsOnLobby: PlayerInfo[] = [];
  private usernames: string[] = [];
  private messages: Message[] = [];
  private rooms: Rooms[] = [];

  constructor() {
    // Initialize 5 rooms
    for (let i = 0; i < 5; i++) {
      this.rooms.push({
        status: 'empty',
        players: [],
        roomId: i + 1,
      });
    }
  }

  handleConnection(client: Socket) {
    this.logger.log('Socket client ' + client.id + ' connected to server');
  }

  @SubscribeMessage('disconnect')
  handleDisconnect(client: Socket) {
    const clientFound = this.clientsOnLobby.find(
      (user) => user.client_id == client.id,
    );

    if (clientFound !== undefined) {
      this.logger.log('Socket client ' + client.id + ' was disconnected!');
      this.server.emit('list_players', {
        add: false,
        username: clientFound.username,
      });
      this.server.emit('list_rooms', this.rooms);
    } else {
      this.logger.log(
        'Socket client ' +
          `${client.id}` +
          ' was disconnected, but was not in the lobby!',
      );
    }
  }

  @SubscribeMessage('join_lobby')
  handleSelectRoom(client: Socket, data: PlayerInfo & { room: number }) {
    const userInRoom = this.clientsOnLobby.find(
      (user) =>
        user.username === data.username && user.client_id === data.client_id,
    );

    userInRoom
      ? (userInRoom.client_id = client.id)
      : this.clientsOnLobby.push({
          client_id: data.client_id,
          username: data.username,
          // email: data.email,
          // password: data.password,
        });

    this.usernames.push(data.username);

    this.server.emit('list_rooms', this.rooms);

    client.broadcast.emit('list_players', {
      add: true,
      username: data.username,
    });
  }

  @SubscribeMessage('list_players')
  handleListPlayers(): string[] {
    return this.usernames.filter((username) => username);
  }

  @SubscribeMessage('list_rooms')
  handleListRooms(): Rooms[] {
    return this.rooms;
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, data: JoinRoom) {
    const nameRoom = data.room.toString();
    client.join(nameRoom);

    const join: JoinRoom = {
      client_id: data.client_id,
      username: data.username,
      room: data.room,
    };

    this.server.to(nameRoom).emit('join_room', join);
    this.updateRoomStatus(data, data.room);
  }

  @SubscribeMessage('message')
  handleMessage(data: Message) {
    const message: Message = {
      username: data.username,
      text: data.text,
    };

    this.messages.push(message);
    this.server.emit('message', message);
  }

  @SubscribeMessage('gameMove')
  handleGameMove(client: Socket, data: GameMoveData) {
    client.to(data.opponentId).emit('gameMove', data);
  }

  @SubscribeMessage('hit')
  handleHit(client: Socket, data: { opponentId: string }) {
    client.to(data.opponentId).emit('hit', data);
  }

  @SubscribeMessage('opponentLife')
  handleOpponentLife(client: Socket, data: { opponentId: string }) {
    client.to(data.opponentId).emit('opponentLife', data);
  }

  @SubscribeMessage('endGame')
  handleEndGame(data: { roomId: number }) {
    this.server.to(data.roomId.toString()).emit('endGame', data);
    this.clearRoom(data.roomId);
  }

  private updateRoomStatus(player: PlayerInfo, roomId: number) {
    this.rooms.forEach((room) => {
      if (room.roomId === roomId) {
        if (room.players.length <= 1) {
          room.players.push(player);

          room.status = 'waiting';
          this.server.emit('list_rooms', this.rooms);
        }

        if (room.players.length === 2) {
          room.players.push(player);

          room.status = 'starting';
          this.server.emit('list_rooms', this.rooms);
        }
      }
    });
  }

  private clearRoom(roomId: number) {
    this.rooms.forEach((room) => {
      if (room.roomId === roomId) {
        room.players = [];
        room.status = 'empty';
        this.server.emit('list_rooms', this.rooms);
        console.log('Sala limpa');
      }
    });
  }
}