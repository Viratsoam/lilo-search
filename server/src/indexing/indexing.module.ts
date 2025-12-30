import { Module } from '@nestjs/common';
import { IndexingService } from './indexing.service';
import { IndexingController } from './indexing.controller';
import { ElasticsearchModule } from '../elasticsearch/elasticsearch.module';
import { DataPreprocessorService } from '../utils/data-preprocessor.service';
import { EmbeddingService } from '../utils/embedding.service';

@Module({
  imports: [ElasticsearchModule],
  controllers: [IndexingController],
  providers: [IndexingService, DataPreprocessorService, EmbeddingService],
})
export class IndexingModule {}

