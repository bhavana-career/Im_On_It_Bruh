import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

const livekitUrl = process.env.LIVEKIT_URL || '';
const apiKey = process.env.LIVEKIT_API_KEY || '';
const apiSecret = process.env.LIVEKIT_API_SECRET || '';

export class LiveKitClient {
  private roomService?: RoomServiceClient;

  constructor() {
    if (livekitUrl && apiKey && apiSecret) {
      // Connect to LiveKit Room Service
      const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
      this.roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    } else {
      console.warn('[LiveKitClient] LiveKit credentials are incomplete. LiveKit integrations will run in mock mode.');
    }
  }

  /**
   * Generate participant token to join a room.
   */
  async generateToken(roomName: string, participantIdentity: string, participantName: string): Promise<string> {
    if (!apiKey || !apiSecret) {
      // Return a dummy token for local dev/testing
      return `mock-livekit-token-${participantIdentity}-${Date.now()}`;
    }

    try {
      const at = new AccessToken(apiKey, apiSecret, {
        identity: participantIdentity,
        name: participantName,
      });

      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
      });

      return await at.toJwt();
    } catch (error) {
      console.error('[LiveKitClient] Failed to generate token:', error);
      throw error;
    }
  }

  /**
   * Force end/delete a room session.
   */
  async endRoom(roomName: string): Promise<void> {
    if (!this.roomService) {
      console.log(`[LiveKitClient] Mock ending room: ${roomName}`);
      return;
    }

    try {
      await this.roomService.deleteRoom(roomName);
      console.log(`[LiveKitClient] Successfully ended room: ${roomName}`);
    } catch (error) {
      console.error(`[LiveKitClient] Failed to end room ${roomName}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve active participant list for a room.
   */
  async getParticipants(roomName: string): Promise<any[]> {
    if (!this.roomService) {
      return [
        { identity: 'mock-admin-id', joinedAt: Date.now() - 600000 },
        { identity: 'mock-user-id', joinedAt: Date.now() - 500000 },
      ];
    }

    try {
      const list = await this.roomService.listParticipants(roomName);
      return list;
    } catch (error) {
      console.error(`[LiveKitClient] Failed to fetch participants for room ${roomName}:`, error);
      return [];
    }
  }
}
