import { Module, Global } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';

/**
 * Feature Flags Module
 * 
 * Global module that provides feature flags service throughout the application.
 * This allows feature flags to be injected into any module.
 */
@Global()
@Module({
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}

