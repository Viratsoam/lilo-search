import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private embeddingPipeline: any = null;
  private readonly EMBEDDING_DIMENSION = 384; // BAAI/bge-small-en dimension
  private readonly MODEL_NAME = 'Xenova/bge-small-en-v1.5';
  private readonly MAX_LENGTH = 512; // Max tokens for bge-small-en

  async onModuleInit() {
    try {
      this.logger.log('🔄 Loading BAAI/bge-small-en embedding model...');
      this.logger.log('⏳ This may take a minute on first run (downloading model)...');
      
      // Use Function-based dynamic import to prevent TypeScript from transforming it
      // This ensures it stays as import() in the compiled output
      const importTransformers = Function('return import("@xenova/transformers")');
      const transformersModule = await importTransformers();
      const { pipeline } = transformersModule;
      
      // Load the embedding model
      this.embeddingPipeline = await pipeline(
        'feature-extraction',
        this.MODEL_NAME,
        {
          quantized: true, // Use quantized model for faster loading and lower memory
        },
      );
      
      this.logger.log('✅ BAAI/bge-small-en embedding model loaded successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to load embedding model', error?.message || error);
      if (error?.stack) {
        this.logger.error('Stack trace:', error.stack);
      }
      this.logger.warn('⚠️ Embeddings will be disabled. Search will use keyword-only mode.');
      this.logger.warn('💡 Hybrid search requires embeddings. Keyword search will still work.');
      this.embeddingPipeline = null;
    }
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.embeddingPipeline) {
      return null;
    }

    try {
      // BGE models expect specific format: "query: " prefix for queries
      // For indexing, we don't need the prefix, but for search queries we should add it
      const processedText = this.prepareText(text);
      
      const result = await this.embeddingPipeline(processedText, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert tensor to array
      const embedding = Array.from(result.data) as number[];
      
      // Ensure dimension is correct
      if (embedding.length !== this.EMBEDDING_DIMENSION) {
        this.logger.warn(
          `Embedding dimension mismatch: expected ${this.EMBEDDING_DIMENSION}, got ${embedding.length}`,
        );
        return null;
      }

      return embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding', error);
      return null;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.embeddingPipeline) {
      return texts.map(() => null);
    }

    try {
      // Process in batches to avoid memory issues
      const batchSize = 32; // Smaller batch for local model
      const results: (number[] | null)[] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize).map((t) => this.prepareText(t));
        
        // Process batch
        const batchResults = await Promise.all(
          batch.map((text) =>
            this.embeddingPipeline!(text, {
              pooling: 'mean',
              normalize: true,
            }).then((result) => {
              const embedding = Array.from(result.data) as number[];
              return embedding.length === this.EMBEDDING_DIMENSION
                ? embedding
                : null;
            }).catch((error) => {
              this.logger.error('Failed to generate embedding in batch', error);
              return null;
            }),
          ),
        );

        results.push(...batchResults);
      }

      return results;
    } catch (error) {
      this.logger.error('Failed to generate embeddings batch', error);
      return texts.map(() => null);
    }
  }

  /**
   * Prepare text for BGE model
   * BGE models work best with specific prefixes, but for general indexing
   * we can use the text as-is. For search queries, we might want to add "query: " prefix.
   */
  private prepareText(text: string): string {
    if (!text) return '';
    
    // Truncate to max length (approximate token count)
    const truncated = text.slice(0, this.MAX_LENGTH * 4); // Rough estimate: 4 chars per token
    
    return truncated.trim();
  }

  /**
   * Prepare query text for BGE model
   * BGE models perform better with "query: " prefix for search queries
   */
  prepareQueryText(query: string): string {
    if (!query) return '';
    
    // BGE models work better with "query: " prefix for search
    const truncated = query.slice(0, this.MAX_LENGTH * 4);
    return `query: ${truncated.trim()}`;
  }

  isEnabled(): boolean {
    return this.embeddingPipeline !== null;
  }

  getDimension(): number {
    return this.EMBEDDING_DIMENSION;
  }
}
