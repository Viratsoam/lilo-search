import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  public readonly client: Client;

  constructor(private configService: ConfigService) {
    const node = this.configService.get<string>('ELASTICSEARCH_NODE') || 'http://localhost:9200';
    
    this.client = new Client({
      node,
      requestTimeout: 60000,
      pingTimeout: 3000,
    });
  }

  async onModuleInit() {
    try {
      const health = await this.client.cluster.health();
      this.logger.log(`✅ Connected to Elasticsearch: ${health.cluster_name}`);
    } catch (error) {
      this.logger.error('❌ Failed to connect to Elasticsearch', error);
      this.logger.warn('💡 Make sure Elasticsearch is running on http://localhost:9200');
    }
  }

  async createIndex(indexName: string, mapping: any) {
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      if (exists) {
        this.logger.log(`Index ${indexName} already exists`);
        return;
      }

      await this.client.indices.create({
        index: indexName,
        body: mapping,
      });
      this.logger.log(`✅ Created index: ${indexName}`);
    } catch (error) {
      this.logger.error(`Failed to create index ${indexName}`, error);
      throw error;
    }
  }

  async deleteIndex(indexName: string) {
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      if (exists) {
        await this.client.indices.delete({ index: indexName });
        this.logger.log(`✅ Deleted index: ${indexName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete index ${indexName}`, error);
      throw error;
    }
  }
}

