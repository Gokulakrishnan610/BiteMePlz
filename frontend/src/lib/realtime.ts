export type RealtimeEventType =
  | 'connected'
  | 'stock_update'
  | 'order_update'
  | 'order_verification'
  | 'product_update'
  | 'notification'
  | 'wallet_update'
  | 'ping'
  | 'error';

export interface StockUpdateEvent {
  product_id: string;
  stock: number;
  shop_id: string;
  timestamp?: string;
}

export interface OrderVerificationEvent {
  order_id: string;
  shop_id: string;
  order_data?: {
    id?: string;
    _id?: string;
    order_id?: string;
    is_verified?: boolean;
    status?: string;
  };
  timestamp?: string;
}

export interface WalletUpdateEvent {
  user_id: string;
  balance: number;
  change?: number;
  transaction_type?: string;
  timestamp?: string;
}

export type RealtimeEventPayload =
  | StockUpdateEvent
  | OrderVerificationEvent
  | WalletUpdateEvent
  | Record<string, unknown>;

export type RealtimeEventHandler = (data: RealtimeEventPayload) => void;

export type ConnectionMode = 'sse' | 'polling' | 'disconnected';
