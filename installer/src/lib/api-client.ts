/**
 * Activity Tracker API への疎通確認用クライアント。
 *
 * `doctor` コマンドや `install` 時の接続テストに使う想定。
 * 実装は P3-T5 で行う。現状は型のみのスタブ。
 */
export interface ApiClientOptions {
  endpoint: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface ApiHealthResult {
  ok: boolean;
  status: number;
  message?: string;
}

export {};
