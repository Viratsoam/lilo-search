import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { DataPreprocessorService } from '../utils/data-preprocessor.service';
import { EmbeddingService } from '../utils/embedding.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);
  private readonly INDEX_NAME = 'products';

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly preprocessor: DataPreprocessorService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  // Get Elasticsearch index mapping with analyzers
  // Loads base schema from elasticsearch-schema.json and applies dynamic configurations
  getIndexMapping() {
    // Load base schema from file
    const schemaPath = this.findSchemaFile();
    if (!schemaPath) {
      throw new Error('Elasticsearch schema file not found');
    }

    const baseSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    // Apply dynamic configurations
    // 1. Load synonyms dynamically
    const synonyms = this.loadSynonyms();
    baseSchema.settings.analysis.filter.synonym_filter.synonyms = synonyms;

    // 2. Conditionally add embedding field if embeddings are enabled
    if (this.embeddingService.isEnabled()) {
      baseSchema.mappings.properties.embedding = {
        type: 'dense_vector',
        dims: this.embeddingService.getDimension(), // BAAI/bge-small-en: 384 dimensions
        index: true,
        similarity: 'cosine',
      };
    } else {
      // Remove embedding field if not enabled
      delete baseSchema.mappings.properties.embedding;
    }

    // Remove _meta from final schema (it's for documentation only)
    delete baseSchema._meta;

    return baseSchema;
  }

  // Find the Elasticsearch schema file
  private findSchemaFile(): string | null {
    const possiblePaths = [
      path.join(__dirname, 'elasticsearch-schema.json'),
      path.join(process.cwd(), 'src/indexing/elasticsearch-schema.json'),
      path.join(process.cwd(), 'server/src/indexing/elasticsearch-schema.json'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return null;
  }

  private loadSynonyms(): string[] {
    try {
      // Try multiple paths for development and production
      const possiblePaths = [
        path.join(__dirname, '../data/synonyms.json'),
        path.join(process.cwd(), 'src/data/synonyms.json'),
        path.join(process.cwd(), 'server/src/data/synonyms.json'),
      ];

      let synonymsPath: string | null = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          synonymsPath = p;
          break;
        }
      }

      if (!synonymsPath) {
        this.logger.warn('Synonyms file not found, using empty list');
        return [];
      }

      const synonymsData = JSON.parse(
        fs.readFileSync(synonymsPath, 'utf-8'),
      );
      
      // Convert array of arrays to Elasticsearch synonym format
      return synonymsData.flatMap((pair: string[]) => {
        if (pair.length >= 2) {
          // Create bidirectional synonyms: a,b => a,b and b,a
          return [pair.join(','), pair.reverse().join(',')];
        }
        return [];
      });
    } catch (error) {
      this.logger.warn('Failed to load synonyms, using empty list', error);
      return [];
    }
  }

  async createIndex() {
    const mapping = this.getIndexMapping();
    await this.elasticsearchService.createIndex(this.INDEX_NAME, mapping);
  }

  async indexProducts(batchSize = 100) {
    try {
      // Try multiple paths for development and production
      const possiblePaths = [
        path.join(__dirname, '../data/products.json'),
        path.join(process.cwd(), 'src/data/products.json'),
        path.join(process.cwd(), 'server/src/data/products.json'),
      ];

      let productsPath: string | null = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          productsPath = p;
          break;
        }
      }

      if (!productsPath) {
        throw new Error('Products file not found. Check data/products.json exists.');
      }

      const products: any[] = JSON.parse(
        fs.readFileSync(productsPath, 'utf-8'),
      );

      this.logger.log(`📦 Found ${products.length} products to index`);

      // Process in batches
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const processedBatch = await this.processBatch(batch);

        const body = processedBatch.flatMap((item) => [
          { index: { _index: this.INDEX_NAME, _id: item._id } },
          item.document,
        ]);

        const bulkResponse = await this.elasticsearchService.client.bulk({
          refresh: i + batchSize >= products.length ? 'wait_for' : false,
          body,
        });

        // Check for errors in bulk response
        if (bulkResponse.errors) {
          const erroredItems = bulkResponse.items.filter((item: any) => item.index?.error);
          if (erroredItems.length > 0) {
            this.logger.error(
              `Bulk operation had ${erroredItems.length} errors in batch ${Math.floor(i / batchSize) + 1}`,
            );
            this.logger.error('First error:', JSON.stringify(erroredItems[0].index.error, null, 2));
          }
        }

        this.logger.log(
          `✅ Indexed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(products.length / batchSize)}`,
        );
      }

      this.logger.log(`🎉 Successfully indexed ${products.length} products`);
    } catch (error) {
      this.logger.error('Failed to index products', error);
      throw error;
    }
  }

  private async processBatch(products: any[]) {
    const processed = products.map((product) => {
      // Extract _id separately - don't include it in document body
      const { _id, ...productWithoutId } = product;
      
      const normalized = {
        ...productWithoutId,
        unit_of_measure: this.preprocessor.normalizeUnit(
          product.unit_of_measure,
        ),
        category: this.preprocessor.normalizeCategory(product.category),
        normalized_category: this.preprocessor.normalizeCategory(
          product.category,
        ),
        normalized_unit: this.preprocessor.normalizeUnit(
          product.unit_of_measure,
        ),
        title: this.preprocessor.cleanText(product.title),
        description: this.preprocessor.cleanText(product.description),
        attributes: this.preprocessor.normalizeAttributes(
          product.attributes || {},
        ),
        normalized_attributes: this.preprocessor.normalizeAttributes(
          product.attributes || {},
        ),
        bulk_pack_size: this.preprocessor.normalizeBulkPackSize(
          product.bulk_pack_size,
        ),
        searchable_text: this.preprocessor.generateSearchableText(product),
      };

      // Return both the normalized document and the _id
      return { _id, document: normalized };
    });

    // Generate embeddings if enabled
    if (this.embeddingService.isEnabled()) {
      const texts = processed.map((item) => item.document.searchable_text);
      const embeddings = await this.embeddingService.generateEmbeddings(texts);

      processed.forEach((item, index) => {
        if (embeddings[index]) {
          item.document.embedding = embeddings[index];
        }
      });
    }

    return processed;
  }

  async reindex() {
    this.logger.log('🔄 Starting reindex...');
    await this.elasticsearchService.deleteIndex(this.INDEX_NAME);
    await this.createIndex();
    await this.indexProducts();
    this.logger.log('✅ Reindex complete');
  }
}

