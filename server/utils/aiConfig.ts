/**
 * AI Configuration Constants
 * Centralized configuration for AI/LLM integrations
 */

/**
 * Claude model identifier for Anthropic API calls
 * Update this when upgrading to newer Claude versions
 */
export const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219'

/**
 * Default temperature for Claude API calls
 * Lower values = more consistent, predictable output
 */
export const CLAUDE_DEFAULT_TEMPERATURE = 0.3

/**
 * Default max tokens for Claude API calls
 */
export const CLAUDE_DEFAULT_MAX_TOKENS = 2048
