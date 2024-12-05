// src/game.gateway.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { Server, Socket } from 'socket.io';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let mockServer: Partial<Server>;
  let mockSocket: Partial<Socket>;

  beforeEach(async () => {
    mockServer = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    mockSocket = {
      id: 'test-socket-id',
      join: jest.fn(),
      broadcast: {
        emit: jest.fn(),
      } as any,
      to: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GameGateway],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gateway.server = mockServer as Server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('Room Management', () => {
    it('should initialize with 5 empty rooms', () => {
      expect(gateway['rooms'].length).toBe(5);
      gateway['rooms'].forEach(room => {
        expect(room.status).toBe('empty');
        expect(room.players.length).toBe(0);
      });
    });

    it('should handle room selection', () => {
      const userData = {
        client_id: 'test-client-id',
        username: 'testUser',
        room: 1
      };

      gateway.handleSelectRoom(mockSocket as Socket, userData);

      expect(mockServer.emit).toHaveBeenCalledWith('list_rooms', expect.any(Array));
      expect(mockServer.emit).toHaveBeenCalledWith('status_room', 'empty');
      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith('list_players', {
        add: true,
        username: 'testUser'
      });
    });
  });

  describe('Message Handling', () => {
    it('should handle and broadcast messages', () => {
      const messageData = {
        username: 'testUser',
        text: 'Hello, world!'
      };

      gateway.handleMessage(mockSocket as Socket, messageData);

      expect(mockServer.emit).toHaveBeenCalledWith('message', {
        username: 'testUser',
        text: 'Hello, world!'
      });

      // Verify message was added to messages array
      expect(gateway['messages']).toContainEqual(messageData);
    });
  });

  describe('Game Events', () => {
    it('should handle game moves', () => {
      const gameMoveData = {
        opponentId: 'opponent-socket-id'
      };

      gateway.handleGameMove(mockSocket as Socket, gameMoveData);

      expect(mockSocket.to).toHaveBeenCalledWith('opponent-socket-id');
    });

    it('should handle hit events', () => {
      const hitData = {
        opponentId: 'opponent-socket-id'
      };

      gateway.handleHit(mockSocket as Socket, hitData);

      expect(mockSocket.to).toHaveBeenCalledWith('opponent-socket-id');
    });

    it('should handle end game events', () => {
      const endGameData = {
        roomId: 1
      };

      gateway.handleEndGame(mockSocket as Socket, endGameData);

      // Check if room was cleared
      const room = gateway['rooms'].find(r => r.roomId === 1);
      expect(room.status).toBe('empty');
      expect(room.players.length).toBe(0);

      // Check server emission
      expect(mockServer.to).toHaveBeenCalledWith('1');
      expect(mockServer.emit).toHaveBeenCalledWith('list_rooms', expect.any(Array));
    });
  });

  describe('Room Joining', () => {
    it('should allow joining a room', () => {
      const joinData = {
        client_id: 'test-client-id',
        username: 'testUser',
        room: 1
      };

      gateway.handleJoinRoom(mockSocket as Socket, joinData);

      // Verify socket joined the room
      expect(mockSocket.join).toHaveBeenCalledWith('1');

      // Verify room status update
      const room = gateway['rooms'].find(r => r.roomId === 1);
      expect(room.players.length).toBeGreaterThan(0);
      expect(room.status).toBe('waiting');
    });
  });
});