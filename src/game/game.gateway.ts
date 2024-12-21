import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import {
  JoinRoom,
  Message,
  Rooms,
  GameMove,
  EndGame,
  Hit,
  OpponentLife,
  ClientToServerEvents,
  ServerToClientEvents,
  RoomClient,
} from "../types/game.types";
import { Logger, OnModuleInit } from "@nestjs/common";

@WebSocketGateway()
export class GameGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server<ClientToServerEvents, ServerToClientEvents>;

  private logger = new Logger("SocketGameGateway");

  private clientsOnLobby: RoomClient[] = [];
  private messages: Message[] = [];
  private rooms: Rooms[] = [];

  constructor() {
    // Initialize 5 rooms
    for (let i = 0; i < 5; i++) {
      this.rooms.push({
        status: "empty",
        players: [],
        roomId: i + 1,
      });
    }
  }

  onModuleInit() {
    const socketPort = Number(process.env.SOCKET_SERVER_PORT);
    const frontendUrl = process.env.FRONTEND_URL;

    // Dynamically reconfigure if needed
    this.server.attach(socketPort, {
      cors: {
        origin: frontendUrl,
      },
      pingTimeout: Number(process.env.PING_TIME_OUT),
      pingInterval: Number(process.env.PING_INTERVAL),
      maxHttpBufferSize: Number(process.env.MAX_HTTP_BUFFER_SIZE),
    });

    this.logger.log(
      `Socket Server initialized successfully on port ${socketPort}`
    );
  }

  handleConnection(client: Socket) {
    this.logger.log(
      `New Socket Connetion: ${client.id} | IP: ${client.handshake.address}`
    );
  }

  handleDisconnect(client: Socket) {
    const clientFound = this.clientsOnLobby.find(
      (user) => user.client_id == client.id
    );

    if (clientFound !== undefined) {
      this.removeClientFromLobby(client);
      this.logger.log(
        `Socket disconnection: ${client.id} | Reason: ${client.disconnected}`
      );

      this.server.emit("list_players", {
        add: false,
        username: clientFound.username,
      });
      this.server.emit("list_rooms", this.rooms);
    } else {
      this.logger.warn(
        `Socket disconnection(Not in the lobby): ${client.id} | Reason: ${client.disconnected}`
      );
    }

    if (this.clientsOnLobby.length === 0 && this.messages.length !== 0) {
      this.clearMessages();
    }
  }

  @SubscribeMessage("join_lobby")
  handleJoinLobby(client: Socket, data: RoomClient) {
    const userInRoom = this.clientsOnLobby.find(
      (user) =>
        user.username === data.username && user.client_id === data.client_id
    );

    userInRoom
      ? (userInRoom.client_id = client.id)
      : this.clientsOnLobby.push({
          client_id: data.client_id,
          username: data.username,
          // email: data.email,
          // password: data.password,
        });

    this.server.emit("list_rooms", this.rooms);

    client.broadcast.emit("list_players", {
      add: true,
      username: data.username,
    });
  }

  @SubscribeMessage("list_players")
  handleListPlayers(): string[] {
    return this.clientsOnLobby.map((client) => client.username);
  }

  @SubscribeMessage("list_rooms")
  handleListRooms(): Rooms[] {
    return this.rooms;
  }

  @SubscribeMessage("list_messages")
  handleListMessages(): Message[] {
    return this.messages;
  }

  @SubscribeMessage("join_room")
  handleJoinRoom(client: Socket, data: JoinRoom) {
    const nameRoom = data.room.toString();
    client.join(nameRoom);

    const join: JoinRoom = {
      client_id: data.client_id,
      username: data.username,
      room: data.room,
    };

    this.server.to(nameRoom).emit("join_room", join);
    this.updateRoomStatus(data, data.room);
    this.removeClientFromLobby(client);
  }

  @SubscribeMessage("message")
  handleMessage(client: Socket, data: Message) {
    const message: Message = {
      username: data.username,
      text: data.text,
      hour: data.hour,
    };

    this.messages.push(message);
    this.server.emit("message", message);
  }

  @SubscribeMessage("gameMove")
  handleGameMove(client: Socket, data: GameMove) {
    client.to(data.opponentId).emit("gameMove", data);
  }

  @SubscribeMessage("hit")
  handleHit(client: Socket, data: Hit) {
    client.to(data.opponentId).emit("hit", data);
  }

  @SubscribeMessage("opponentLife")
  handleOpponentLife(client: Socket, data: OpponentLife) {
    client.to(data.opponentId).emit("opponentLife", data);
  }

  @SubscribeMessage("endGame")
  handleEndGame(client: Socket, data: EndGame) {
    this.server.to(data.roomId).emit("endGame", data);
    this.clearRoom(data.roomId);
  }

  private updateRoomStatus(player: RoomClient, roomId: string) {
    this.rooms.forEach((room) => {
      if (room.roomId === roomId) {
        if (room.players.length <= 1) {
          room.players.push(player);

          room.status = "waiting";
          this.server.emit("list_rooms", this.rooms);
        }

        if (room.players.length === 2) {
          room.players.push(player);

          room.status = "starting";
          this.server.emit("list_rooms", this.rooms);
        }
      }
    });
  }

  private clearRoom(roomId: string) {
    this.rooms.forEach((room) => {
      if (room.roomId === roomId) {
        room.players = [];
        room.status = "empty";
        this.server.emit("list_rooms", this.rooms);
      }
    });
  }

  private removeClientFromLobby(client: Socket) {
    const clientIndex = this.clientsOnLobby.findIndex(
      (user) => user.client_id === client.id
    );

    if (clientIndex !== -1) {
      this.clientsOnLobby.splice(clientIndex, 1);
    }
  }

  private clearMessages() {
    this.messages = [];
    this.logger.log("Messages Cleared - No Users in Lobby");
  }
}
