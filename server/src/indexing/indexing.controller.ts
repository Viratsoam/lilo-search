import { Controller, Post, Get, Logger } from '@nestjs/common';
import { IndexingService } from './indexing.service';

@Controller('indexing')
export class IndexingController {
  private readonly logger = new Logger(IndexingController.name);

  constructor(private readonly indexingService: IndexingService) {}

  @Post('create')
  async createIndex() {
    this.logger.log('Creating index...');
    await this.indexingService.createIndex();
    return { message: 'Index created successfully' };
  }

  @Post('index')
  async indexProducts() {
    this.logger.log('Indexing products...');
    await this.indexingService.indexProducts();
    return { message: 'Products indexed successfully' };
  }

  @Post('reindex')
  async reindex() {
    this.logger.log('Reindexing...');
    await this.indexingService.reindex();
    return { message: 'Reindex completed successfully' };
  }

  @Get('mapping')
  getMapping() {
    return this.indexingService.getIndexMapping();
  }
}

