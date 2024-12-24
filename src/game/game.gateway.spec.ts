import { Test, TestingModule } from "@nestjs/testing";
import { Socket } from "socket.io";
import { GameGateway } from "./game.gateway";
import { JoinRoom, Message, CharacterSides, RoomClient } from "../types/game.types";
import { v4 as uuidv4 } from "uuid";

describe("GameGateway", () => {
  let gateway: GameGateway;
  let mockSocket: Partial<Socket>;
  let mockServer: any;
  let roomId: string = uuidv4();

  beforeEach(async () => {
    // Mock server methods
    mockServer = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GameGateway],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);

    // Set the mocked server
    (gateway as any).server = mockServer;

    mockSocket = {
      id: "test-socket-id",
      join: jest.fn(),
      broadcast: {
        emit: jest.fn(),
      } as any,
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
  });

  describe("Initialization", () => {
    it("should initialize with 5 empty rooms", () => {
      // Use reflection to access private rooms property
      const rooms = (gateway as any).rooms;
      expect(rooms.length).toBe(5);
      rooms.forEach((room) => {
        expect(room.status).toBe("empty");
        expect(room.players.length).toBe(0);
      });
    });
  });

  describe("Lobby Management", () => {
    it("should handle joining lobby", () => {
      const playerData: RoomClient = {
        client_id: "test-socket-id",
        username: "TestPlayer",
      };

      // Call the method directly with mocked socket
      gateway.handleJoinLobby(mockSocket as Socket, playerData);

      // Check that server emitted events
      expect(mockServer.emit).toHaveBeenCalledWith(
        "list_rooms",
        expect.any(Array)
      );
      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith("list_players", {
        add: true,
        username: "TestPlayer",
      });
    });

    it("should join room and update room status", () => {
      const joinRoomData: JoinRoom = {
        client_id: "test-socket-id",
        username: "TestPlayer",
        roomId,
      };

      // Mock socket.join method
      mockSocket.join = jest.fn();

      gateway.handleJoinRoom(mockSocket as Socket, joinRoomData);

      // Check room join and server events
      expect(mockSocket.join).toHaveBeenCalledWith("1");
      expect(mockServer.to).toHaveBeenCalledWith("1");
    });
  });

  describe("Message Handling", () => {
    it("should handle and broadcast messages", () => {
      const date = new Date();

      const dateString =
        String(date.getHours()) + ":" + String(date.getMinutes());

      const messageData: Message = {
        username: "TestPlayer",
        text: "Hello, world!",
        hour: dateString,
      };

      gateway.handleMessage(mockSocket as Socket, messageData);

      // Check server broadcast
      expect(mockServer.emit).toHaveBeenCalledWith("message", messageData);
    });
  });

  describe("Game Mechanics", () => {
    it("should handle game moves", () => {
      const gameMoveData = {
        opponentId: "opponent-socket-id",
        playerId: "test-socket-id",
        xAxis: 100,
        yAxis: 200,
        side: "down" as CharacterSides,
      };

      gateway.handleGameMove(mockSocket as Socket, gameMoveData);

      // Verify socket method calls
      expect(mockSocket.to).toHaveBeenCalledWith("opponent-socket-id");
      expect(mockSocket.to("opponent-socket-id").emit).toHaveBeenCalledWith(
        "gameMove",
        gameMoveData
      );
    });

    it("should handle end game and clear room", () => {
      const endGameData = {
        roomId,
        winner: "TestPlayer",
        opponentId: "opponent-id",
      };

      gateway.handleEndGame(mockSocket as Socket, endGameData);

      // Check server broadcast
      expect(mockServer.to).toHaveBeenCalledWith("1");
      expect(mockServer.to("1").emit).toHaveBeenCalledWith(
        "endGame",
        endGameData
      );
    });
  });
});
