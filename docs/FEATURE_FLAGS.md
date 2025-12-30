# Feature Flags Documentation

## Overview

The Lilo Search Engine uses feature flags to manage different search strategies and functionality. All feature flags are driven by environment variables, making it easy to configure and deploy different search behaviors without code changes.

## Environment Variables

### Global Search Control

#### `SEARCH_ENABLED`
- **Type:** Boolean
- **Default:** `true`
- **Description:** Global flag to enable/disable search functionality
- **Values:** `true`, `false`, `1`, `0`, `yes`, `no`, `on`, `off`
- **Example:** `SEARCH_ENABLED=false`

When disabled, all search requests will return a `503 Service Unavailable` error.

---

### Search Strategy

#### `SEARCH_STRATEGY`
- **Type:** String (enum)
- **Default:** `hybrid`
- **Description:** Determines the active search strategy
- **Values:**
  - `hybrid` - Combines keyword and semantic search (default)
  - `keyword_only` - Uses only keyword search
  - `semantic_only` - Uses only semantic/vector search
- **Example:** `SEARCH_STRATEGY=keyword_only`

**Note:** Semantic-only requires embeddings to be available. If embeddings are not loaded, it will fall back to keyword search.

---

### Individual Feature Flags

#### `HYBRID_SEARCH_ENABLED`
- **Type:** Boolean
- **Default:** `true`
- **Description:** Enable/disable hybrid search (keyword + semantic)
- **Example:** `HYBRID_SEARCH_ENABLED=false`

**Note:** This flag is only effective when `SEARCH_STRATEGY=hybrid`.

---

#### `PERSONALIZATION_ENABLED`
- **Type:** Boolean
- **Default:** `true`
- **Description:** Enable/disable user personalization features
- **Example:** `PERSONALIZATION_ENABLED=false`

When disabled:
- User order history boosting is disabled
- User type-based personalization is disabled
- User profile-based boosting is disabled

---

#### `FUZZY_MATCHING_ENABLED`
- **Type:** Boolean
- **Default:** `true`
- **Description:** Enable/disable fuzzy matching for typo handling
- **Example:** `FUZZY_MATCHING_ENABLED=false`

When disabled:
- No fuzzy matching in multi_match queries
- No fuzzy match boost for typos

---

#### `SYNONYM_EXPANSION_ENABLED`
- **Type:** Boolean
- **Default:** `true`
- **Description:** Enable/disable synonym expansion
- **Example:** `SYNONYM_EXPANSION_ENABLED=false`

**Note:** Synonym expansion is configured in the Elasticsearch analyzer. This flag is for future use when dynamic synonym management is implemented.

---

## Configuration Examples

### Example 1: Keyword-Only Search (No Embeddings)
```bash
SEARCH_ENABLED=true
SEARCH_STRATEGY=keyword_only
HYBRID_SEARCH_ENABLED=false
PERSONALIZATION_ENABLED=true
FUZZY_MATCHING_ENABLED=true
```

### Example 2: Semantic-Only Search
```bash
SEARCH_ENABLED=true
SEARCH_STRATEGY=semantic_only
PERSONALIZATION_ENABLED=true
```

### Example 3: Disable Search Completely
```bash
SEARCH_ENABLED=false
```

### Example 4: Minimal Search (No Personalization, No Fuzzy)
```bash
SEARCH_ENABLED=true
SEARCH_STRATEGY=keyword_only
PERSONALIZATION_ENABLED=false
FUZZY_MATCHING_ENABLED=false
```

### Example 5: Production Configuration (Full Features)
```bash
SEARCH_ENABLED=true
SEARCH_STRATEGY=hybrid
HYBRID_SEARCH_ENABLED=true
PERSONALIZATION_ENABLED=true
FUZZY_MATCHING_ENABLED=true
SYNONYM_EXPANSION_ENABLED=true
```

---

## Usage in Code

### Checking Feature Flags

```typescript
import { FeatureFlagsService } from './utils/feature-flags.service';

constructor(private featureFlags: FeatureFlagsService) {}

// Check if search is enabled
if (!this.featureFlags.isSearchEnabled()) {
  throw new ServiceUnavailableException('Search is disabled');
}

// Get active search strategy
const strategy = this.featureFlags.getSearchStrategy();
// Returns: SearchStrategy.HYBRID | SearchStrategy.KEYWORD_ONLY | SearchStrategy.SEMANTIC_ONLY

// Check individual features
if (this.featureFlags.isHybridSearchEnabled()) {
  // Use hybrid search
}

if (this.featureFlags.isPersonalizationEnabled()) {
  // Apply personalization
}

if (this.featureFlags.isFuzzyMatchingEnabled()) {
  // Enable fuzzy matching
}
```

### Getting All Feature Flags Status

```typescript
const status = this.featureFlags.getFeatureFlagsStatus();
// Returns:
// {
//   searchEnabled: true,
//   searchStrategy: 'hybrid',
//   hybridSearchEnabled: true,
//   personalizationEnabled: true,
//   fuzzyMatchingEnabled: true,
//   synonymExpansionEnabled: true
// }
```

---

## Feature Flag Priority

1. **Global Flag (`SEARCH_ENABLED`)**: Highest priority - if disabled, nothing works
2. **Search Strategy (`SEARCH_STRATEGY`)**: Determines overall search approach
3. **Individual Flags**: Fine-tune specific features

---

## Environment File Setup

Create a `.env` file in the `server/` directory:

```bash
# .env
ELASTICSEARCH_NODE=http://localhost:9200
PORT=3001
FRONTEND_URL=http://localhost:3000

# Feature Flags
SEARCH_ENABLED=true
SEARCH_STRATEGY=hybrid
HYBRID_SEARCH_ENABLED=true
PERSONALIZATION_ENABLED=true
FUZZY_MATCHING_ENABLED=true
SYNONYM_EXPANSION_ENABLED=true
```

---

## Runtime Behavior

### On Startup

The feature flags service logs the current configuration:

```
🔧 Feature Flags Initialized:
   Search Enabled: true
   Search Strategy: hybrid
   Hybrid Search: true
   Personalization: true
   Fuzzy Matching: true
   Synonym Expansion: true
```

### When Search is Disabled

If `SEARCH_ENABLED=false`, all search requests will return:

```json
{
  "message": "Search functionality is currently disabled",
  "code": "SEARCH_DISABLED"
}
```

Status Code: `503 Service Unavailable`

---

## Testing Feature Flags

### Test Keyword-Only Mode
```bash
SEARCH_STRATEGY=keyword_only npm run start:dev
```

### Test with Personalization Disabled
```bash
PERSONALIZATION_ENABLED=false npm run start:dev
```

### Test with Search Disabled
```bash
SEARCH_ENABLED=false npm run start:dev
```

---

## Future Enhancements

The feature flags system is designed to be easily extensible:

1. **A/B Testing**: Add flags for different search algorithms
2. **Gradual Rollout**: Enable features for percentage of users
3. **Time-based Flags**: Enable features during specific time windows
4. **User-based Flags**: Enable features for specific user segments
5. **Dynamic Flags**: Update flags without restart (requires additional implementation)

---

## Monitoring

Feature flags status can be monitored via:

1. **Startup Logs**: Initial configuration is logged
2. **Health Endpoint**: Add feature flags status to `/health` endpoint
3. **Metrics**: Track search strategy usage in analytics

---

## Best Practices

1. **Default to Enabled**: Most flags default to `true` for backward compatibility
2. **Document Changes**: Update this file when adding new flags
3. **Test Disabled States**: Ensure graceful degradation when flags are disabled
4. **Monitor Performance**: Track performance impact of different strategies
5. **Gradual Rollout**: Use flags to gradually enable new features

---

## Troubleshooting

### Search Returns 503
- Check `SEARCH_ENABLED` environment variable
- Verify it's set to `true` or not set (defaults to true)

### Hybrid Search Not Working
- Check `SEARCH_STRATEGY=hybrid`
- Check `HYBRID_SEARCH_ENABLED=true`
- Verify embeddings are loaded (check startup logs)

### Personalization Not Applied
- Check `PERSONALIZATION_ENABLED=true`
- Verify user order history is loaded
- Check user profile service is initialized

### Fuzzy Matching Not Working
- Check `FUZZY_MATCHING_ENABLED=true`
- Verify query contains typos (fuzzy matching only applies to typos)

---

**Last Updated:** December 30, 2025

