/**
 * Calculate total tokens including all token types:
 * INPUT + OUTPUT + CACHE_CREATION + CACHE_READ
 *
 * Supports both session-level (totalInputTokens) and turn-level (inputTokens) field names.
 */
export function totalTokens(data: Record<string, any>): number {
  // Session-level fields (totalInputTokens, totalOutputTokens, ...)
  if ('totalInputTokens' in data) {
    return (
      (data.totalInputTokens || 0) +
      (data.totalOutputTokens || 0) +
      (data.totalCacheCreationTokens || 0) +
      (data.totalCacheReadTokens || 0)
    );
  }
  // Turn/subagent-level fields (inputTokens, outputTokens, ...)
  return (
    (data.inputTokens || 0) +
    (data.outputTokens || 0) +
    (data.cacheCreationTokens || 0) +
    (data.cacheReadTokens || 0)
  );
}
