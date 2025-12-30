// ES Module loader for transformers
import { pipeline } from '@xenova/transformers';

let embeddingPipeline = null;

export async function loadModel(modelName = 'Xenova/bge-small-en-v1.5') {
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  embeddingPipeline = await pipeline('feature-extraction', modelName, {
    quantized: true,
  });

  return embeddingPipeline;
}

export async function generateEmbedding(text, pipeline) {
  const result = await pipeline(text, {
    pooling: 'mean',
    normalize: true,
  });

  return Array.from(result.data);
}

