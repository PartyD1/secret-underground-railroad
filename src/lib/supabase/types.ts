export type RoomStatus =
  | "lobby"
  | "setup"
  | "in_progress"
  | "reveal"
  | "complete";

export type GameType = "mafia" | "empire" | "chameleon";

export type ConnectionStatus = "connected" | "disconnected";

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          code: string;
          host_id: string | null;
          status: RoomStatus;
          game_type: GameType;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          code: string;
          host_id?: string | null;
          status?: RoomStatus;
          game_type: GameType;
          created_at?: string;
          expires_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rooms"]["Insert"]>;
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          room_code: string;
          display_name: string;
          joined_at: string;
          connection_status: ConnectionStatus;
        };
        Insert: {
          id?: string;
          room_code: string;
          display_name: string;
          joined_at?: string;
          connection_status?: ConnectionStatus;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
        Relationships: [];
      };
      player_secrets: {
        Row: { player_id: string; secret_token: string };
        Insert: { player_id: string; secret_token?: string };
        Update: Partial<
          Database["public"]["Tables"]["player_secrets"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
