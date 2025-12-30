# Migration to BAAI/bge-small-en

## Summary

The search engine has been migrated from OpenAI embeddings to **BAAI/bge-small-en**, a local embedding model that runs entirely on your machine. This eliminates external API dependencies and costs.

## Changes Made

### 1. Package Dependencies

**Removed:**
- `openai` package

**Added:**
- `@xenova/transformers` - For running transformer models locally

### 2. Embedding Service

- **Model**: BAAI/bge-small-en-v1.5 (via Xenova transformers)
- **Dimensions**: 384 (changed from 1536)
- **Loading**: Automatic on application startup
- **Quantized**: Uses quantized model for faster loading and lower memory

### 3. Index Mapping

- Updated embedding dimension from 1536 to 384
- No need to recreate index if you haven't indexed yet
- If you already have indexed data, you'll need to reindex

### 4. Query Processing

- Search queries now use "query: " prefix for better BGE model performance
- Indexing uses plain text (no prefix needed)

## Benefits

✅ **No API Costs** - Runs completely locally  
✅ **No Rate Limits** - Process as many queries as needed  
✅ **Data Privacy** - All embeddings generated on your machine  
✅ **Always Available** - No external service dependencies  
✅ **Fast** - Quantized model loads quickly and runs efficiently  

## Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **First Run:**
   - The model (~100MB) will be downloaded automatically on first startup
   - This happens once, subsequent starts are faster
   - Model is cached in `node_modules/.cache/`

3. **Reindex (if needed):**
   If you already indexed data with OpenAI embeddings, reindex:
   ```bash
   curl -X POST http://localhost:3001/indexing/reindex
   ```

## Performance

- **Model Load Time**: ~2-5 seconds on first run, cached after
- **Embedding Generation**: ~50-150ms per query
- **Memory Usage**: ~200-300MB when model is loaded
- **Model Size**: ~100MB (quantized)

## Configuration

No configuration needed! The model is enabled by default. If you want to disable embeddings (use keyword-only search), you can modify the `EmbeddingService` to return `null` in `isEnabled()`.

## Model Details

- **Model**: `Xenova/bge-small-en-v1.5`
- **Base Model**: BAAI/bge-small-en-v1.5
- **Dimensions**: 384
- **Max Length**: 512 tokens
- **Language**: English
- **Use Case**: General-purpose semantic search

## Troubleshooting

### Model Fails to Load

If the model fails to load, check:
1. Internet connection (needed for first download)
2. Disk space (need ~100MB free)
3. Node.js version (18+ required)

The system will fall back to keyword-only search if embeddings fail.

### Slow First Request

The first embedding request may be slow (~2-5s) as the model loads. Subsequent requests are much faster.

### Memory Issues

If you experience memory issues:
- Reduce batch size in `generateEmbeddings()` method
- Consider using a smaller model variant
- Increase Node.js memory limit: `node --max-old-space-size=4096`

## Future Enhancements

- GPU acceleration (if available)
- Embedding caching for frequently searched products
- Support for other BGE model variants
- Multi-language support with multilingual models

