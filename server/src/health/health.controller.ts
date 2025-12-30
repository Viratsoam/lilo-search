import { Controller, Get } from '@nestjs/common';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { FeatureFlagsService } from '../utils/feature-flags.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  @Get()
  async check() {
    try {
      const health = await this.elasticsearchService.client.cluster.health();
      const ping = await this.elasticsearchService.client.ping();

      return {
        status: 'ok',
        elasticsearch: {
          connected: ping,
          cluster: health.cluster_name,
          status: health.status,
        },
        featureFlags: this.featureFlags.getFeatureFlagsStatus(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        elasticsearch: {
          connected: false,
        },
        featureFlags: this.featureFlags.getFeatureFlagsStatus(),
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

