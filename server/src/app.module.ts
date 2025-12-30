import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchModule } from './search/search.module';
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module';
import { IndexingModule } from './indexing/indexing.module';
import { FeatureFlagsModule } from './utils/feature-flags.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    FeatureFlagsModule, // Global feature flags module
    ElasticsearchModule,
    SearchModule,
    IndexingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

