import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { ElasticsearchModule } from '../elasticsearch/elasticsearch.module';
import { EmbeddingService } from '../utils/embedding.service';
import { UserTypeService } from '../utils/user-type.service';
import { UserProfileService } from '../utils/user-profile.service';

@Module({
  imports: [ElasticsearchModule],
  controllers: [SearchController],
  providers: [SearchService, EmbeddingService, UserTypeService, UserProfileService],
})
export class SearchModule {}

