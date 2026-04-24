export type ApiSuccess<T> = {
  success: true;
  data: T;
  message: string;
};

export type ApiError = {
  success: false;
  data: Record<string, unknown>;
  message: string;
};

export type LeaderboardItem = {
  rank: number;
  username: string;
  score: number;
};

export type MissionCompleteInput = {
  actionId: string;
};

export type RegisterInput = {
  username: string;
  password: string;
};

export type LoginInput = {
  username: string;
  password: string;
};

export function ok<T>(data: T, message = ""): ApiSuccess<T> {
  return { success: true, data, message };
}

export function fail(message: string, data: Record<string, unknown> = {}): ApiError {
  return { success: false, data, message };
}
