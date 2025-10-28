# AI Chart Generation Integration

## Overview

This document describes the AI chart generation integration that was added to the Report Builder page (`/reporting/builder`). The integration allows users to use natural language to create and modify charts using Claude AI.

## Architecture

### Components Modified

1. **pages/reporting/builder.vue**
   - Added AI mode toggle
   - Added chat interface for AI interactions
   - Added connection selector for AI mode
   - Integrated with ReportingBuilder component to apply AI-generated SQL and chart config

2. **components/reporting/ReportingBuilder.vue**
   - Exposed `applySqlAndChartType()` method to allow parent to inject SQL and chart type
   - Exposed `getCurrentState()` method to get current SQL, chart type, and appearance
   - Uses `defineExpose()` to make these methods available to parent components

3. **server/api/reporting/ai-chart-assistant.post.ts** (NEW)
   - API endpoint for AI chart generation
   - Accepts current SQL, chart type, and appearance settings
   - Sends context to Claude AI along with user request
   - Returns: SQL query, chart config, chart type, and explanation

## User Flow

### 1. Enable AI Mode
- Toggle "AI Mode" switch in the left sidebar
- When enabled, shows AI chat interface and hides traditional data sources/zones UI
- Shows connection selector dropdown

### 2. Select Data Connection
- User selects a data connection from the dropdown
- This is required for AI to understand the available schema

### 3. Chat with AI
- User types natural language request (e.g., "Show me total sales by category")
- Press Enter or click Send button
- AI processes the request with context:
  - Current SQL (if any)
  - Current chart type (if any)
  - Current appearance settings (if any)
  - Database schema

### 4. Auto-Apply Changes
- AI returns:
  - **SQL Query**: Automatically applied to the builder
  - **Chart Type**: Automatically set (bar, pie, line, etc.)
  - **Explanation**: Shown in chat to explain what was done
- SQL is applied using "Override SQL" mode
- Chart is automatically executed and rendered

### 5. Iterative Refinement
- User can continue chatting to refine the chart
- Examples:
  - "Make it a pie chart instead"
  - "Add a limit of 10 rows"
  - "Group by date"
- AI builds upon the current state each time

## API Details

### Request Format

```typescript
POST /api/reporting/ai-chart-assistant

{
  connectionId: number,          // Required: Data connection ID
  userPrompt: string,            // Required: User's natural language request
  currentSql?: string,           // Optional: Current SQL query
  currentChartType?: string,     // Optional: Current chart type
  currentAppearance?: object,    // Optional: Current appearance settings
  datasetId?: string,            // Optional: Dataset ID
  schemaJson?: object            // Optional: Schema override
}
```

### Response Format

```typescript
{
  sql: string,                   // Generated SQL query
  chartConfig: object,           // ECharts configuration
  chartType: string,             // Chart type (pie, bar, line, etc.)
  explanation: string,           // Human-readable explanation (2-3 sentences)
  usage?: object                 // Claude API usage stats
}
```

## Technical Implementation Details

### State Management

- **AI Chat State**: Managed in `pages/reporting/builder.vue`
  - `aiMessages`: Array of chat messages (user + assistant)
  - `aiInput`: Current input text
  - `aiLoading`: Loading state during API call
  
- **Builder State**: Managed in `components/reporting/ReportingBuilder.vue`
  - Uses existing state management (zones, SQL, chart type)
  - Exposed via `getCurrentState()` and `applySqlAndChartType()` methods

### Communication Pattern

```
User Input → sendAiMessage()
            → Get current state from ReportingBuilder
            → Call /api/reporting/ai-chart-assistant
            → Receive response
            → Apply to ReportingBuilder via applySqlAndChartType()
            → Display explanation in chat
```

### Claude AI Integration

- **Model**: claude-3-7-sonnet-20250219
- **Temperature**: 0.3 (for consistent, predictable results)
- **Max Tokens**: 2048
- **System Prompt**: Instructs Claude to be a BI assistant that:
  - Builds upon existing state when provided
  - Returns JSON with sql, chartConfig, explanation
  - Uses appropriate chart types for the data
  - Keeps explanations concise (2-3 sentences)

## Example Interactions

### Starting from Scratch

```
User: "Show me the top 10 film categories by number of films"

AI Response:
SQL: SELECT c.name, COUNT(*) as count 
     FROM category c 
     JOIN film_category fc ON c.category_id = fc.category_id 
     GROUP BY c.name 
     ORDER BY count DESC 
     LIMIT 10

Chart Type: bar
Explanation: "I've created a bar chart showing the top 10 film categories. 
The query counts films per category and orders them by popularity."
```

### Iterating on Existing Chart

```
User: "Make it a pie chart"

AI Response:
SQL: [Same as before]
Chart Type: pie
Explanation: "I've converted the visualization to a pie chart to show 
the distribution of film categories."
```

### Refining the Data

```
User: "Show only the top 5 instead"

AI Response:
SQL: SELECT c.name, COUNT(*) as count 
     FROM category c 
     JOIN film_category fc ON c.category_id = fc.category_id 
     GROUP BY c.name 
     ORDER BY count DESC 
     LIMIT 5

Chart Type: pie
Explanation: "I've updated the query to show only the top 5 categories 
for a more focused view."
```

## Features

### ✅ Implemented
- AI mode toggle
- Connection selector
- Chat interface with message history
- Auto-scrolling chat
- Loading states
- Error handling
- Context-aware generation (builds on current state)
- Auto-apply SQL and chart type
- Support for all chart types (bar, pie, line, area, etc.)

### 🚧 Future Enhancements
- Persist chat history in browser storage
- Export SQL/chart config
- Suggest improvements for existing charts
- Handle more complex appearance customizations
- Support for custom ECharts configurations
- Multi-turn conversation memory
- Chart type recommendations based on data

## Connection Management

When AI generates SQL, it's executed against the **specific connection selected by the user** in the AI mode UI. This is handled through:

1. **Connection ID Propagation**:
   - User selects connection in AI mode dropdown
   - `connectionId` is stored in parent component state
   - Passed to `ReportingBuilder` component via props
   - Used when executing AI-generated SQL

2. **SQL Execution Flow**:
   ```
   User selects connection → AI generates SQL → 
   runSql(sql, limit, connectionId) → 
   API loads specific connection config from Supabase →
   Executes query against correct database
   ```

3. **Fallback Behavior**:
   - If no connectionId provided, falls back to debug/default connection
   - This maintains backward compatibility with existing code

## Security & Validation

- **Authentication**: User must be authenticated (checked in API)
- **Authorization**: User must own the data connection (verified in API when loading config)
- **Connection Isolation**: Each query runs against the user-selected connection only
- **SQL Safety**: Only SELECT queries allowed, enforced at execution
- **Schema Access**: Uses saved schema or live introspection with proper permissions

## Error Handling

- Missing connection: Prompts user to select one
- API errors: Displayed in chat as friendly messages
- SQL errors: Handled by builder component (shown in preview area)
- Invalid chart types: Falls back to table view

## Performance Considerations

- API calls are debounced by user input (manual send)
- SQL execution uses existing preview mechanism with LIMIT clauses
- Schema is cached at connection level
- Chat messages stored in memory (no persistence yet)

## Environment Requirements

- `CLAUDE_AI_KEY` environment variable must be set
- Active Supabase connection for data access
- Node.js server with Anthropic SDK installed

## Related Files

- `/pages/reporting/builder.vue` - Main page with AI integration
- `/components/reporting/ReportingBuilder.vue` - Chart builder component
- `/server/api/reporting/ai-chart-assistant.post.ts` - AI API endpoint
- `/composables/useReportState.ts` - Report state management
- `/composables/useReportingService.ts` - Data fetching services

