// 仅供 Tauri 静态导出 (BUILD_APP=1) 时使用，避免 server actions 进入静态打包。
// 桌面端不启用 MCP，所有函数返回空实现。

export async function getClientsStatus(): Promise<Record<string, unknown>> {
  return {};
}

export async function getClientTools(_clientId: string): Promise<unknown> {
  return null;
}

export async function getAvailableClientsCount(): Promise<number> {
  return 0;
}

export async function getAllTools(): Promise<unknown[]> {
  return [];
}

export async function initializeMcpSystem(): Promise<void> {}

export async function addMcpServer(
  _clientId: string,
  _config: unknown,
): Promise<void> {}

export async function pauseMcpServer(_clientId: string): Promise<void> {}

export async function resumeMcpServer(_clientId: string): Promise<void> {}

export async function removeMcpServer(_clientId: string): Promise<void> {}

export async function restartAllClients(): Promise<void> {}

export async function executeMcpAction(
  _clientId: string,
  _request: unknown,
): Promise<unknown> {
  return null;
}

export async function getMcpConfigFromFile(): Promise<unknown> {
  return { mcpServers: {} };
}

export async function isMcpEnabled(): Promise<boolean> {
  return false;
}
