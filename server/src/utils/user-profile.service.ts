import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface UserProfile {
  userId: string;
  // User type
  userType: string;
  preferredCategories: string[];
  preferredVendors: string[];
  
  // Behavioral patterns
  deliveryModePreference: string | null; // 'Express', 'Drop-Ship', 'Pick-up', 'Standard'
  regionPreferences: string[]; // ['BR', 'MX', 'ES', etc.]
  priceSegment: 'budget' | 'mid' | 'premium'; // Based on avg order value
  qualityFocused: boolean; // Prefers high-rated products (≥4.0)
  prefersInStock: boolean; // Prefers in-stock items
  orderFrequency: 'occasional' | 'regular' | 'frequent' | 'vip'; // Based on order count
  bulkBuyer: boolean; // Buys in large quantities (avg qty > 30)
  
  // Stats
  avgOrderValue: number;
  orderCount: number;
  avgQuantity: number;
  avgRating: number;
}

@Injectable()
export class UserProfileService implements OnModuleInit {
  private readonly logger = new Logger(UserProfileService.name);
  private userProfiles: Map<string, UserProfile> = new Map();

  async onModuleInit() {
    await this.analyzeUserProfiles();
  }

  private async analyzeUserProfiles() {
    try {
      // Load data files
      const ordersPath = this.findDataFile('orders.json');
      const productsPath = this.findDataFile('products.json');

      if (!ordersPath || !productsPath) {
        this.logger.warn('Data files not found, user profile analysis skipped');
        return;
      }

      const orders: any[] = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
      const products: any[] = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
      const productMap = new Map(products.map((p) => [p._id, p]));

      // Analyze each user
      const userStats = new Map<
        string,
        {
          categories: Map<string, number>;
          vendors: Map<string, number>;
          deliveryModes: Map<string, number>;
          regions: Set<string>;
          orderValues: number[];
          quantities: number[];
          ratings: number[];
          inventoryStatuses: Map<string, number>;
          orderCount: number;
        }
      >();

      orders.forEach((order) => {
        const userId = order.user_id;
        if (!userStats.has(userId)) {
          userStats.set(userId, {
            categories: new Map(),
            vendors: new Map(),
            deliveryModes: new Map(),
            regions: new Set(),
            orderValues: [],
            quantities: [],
            ratings: [],
            inventoryStatuses: new Map(),
            orderCount: 0,
          });
        }

        const stats = userStats.get(userId)!;
        stats.orderCount++;

        // Track delivery mode
        if (order.delivery_mode) {
          stats.deliveryModes.set(
            order.delivery_mode,
            (stats.deliveryModes.get(order.delivery_mode) || 0) + 1,
          );
        }

        // Track order value
        const orderValue = order.cart?.items?.reduce(
          (sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1),
          0,
        ) || 0;
        stats.orderValues.push(orderValue);

        order.cart?.items?.forEach((item: any) => {
          const product = productMap.get(item.product_id);
          if (product) {
            // Categories
            const category = product.category || 'Uncategorized';
            const categoryKey = category.split('>')[0].trim();
            stats.categories.set(
              categoryKey,
              (stats.categories.get(categoryKey) || 0) + (item.quantity || 1),
            );

            // Vendors
            if (product.vendor) {
              stats.vendors.set(
                product.vendor,
                (stats.vendors.get(product.vendor) || 0) + 1,
              );
            }

            // Regions
            if (product.region_availability) {
              product.region_availability.forEach((r: string) =>
                stats.regions.add(r),
              );
            }

            // Ratings
            if (product.supplier_rating) {
              stats.ratings.push(product.supplier_rating);
            }

            // Inventory status
            if (product.inventory_status) {
              stats.inventoryStatuses.set(
                product.inventory_status,
                (stats.inventoryStatuses.get(product.inventory_status) || 0) + 1,
              );
            }
          }

          // Quantities
          stats.quantities.push(item.quantity || 1);
        });
      });

      // Build user profiles
      userStats.forEach((stats, userId) => {
        // Determine user type from dominant category
        const topCategories = Array.from(stats.categories.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat]) => cat);

        let userType = 'General Buyer';
        if (topCategories.length > 0) {
          const dominantCategory = topCategories[0].toLowerCase();
          if (dominantCategory.includes('safety') || dominantCategory.includes('glove') || dominantCategory.includes('mask')) {
            userType = 'Safety Equipment Buyer';
          } else if (dominantCategory.includes('industrial') || dominantCategory.includes('pump') || dominantCategory.includes('compressor')) {
            userType = 'Industrial Equipment Buyer';
          } else if (dominantCategory.includes('tool')) {
            userType = 'Tools Buyer';
          } else if (dominantCategory.includes('chemical') || dominantCategory.includes('lubricant')) {
            userType = 'Chemicals Buyer';
          } else if (dominantCategory.includes('electrical') || dominantCategory.includes('cable')) {
            userType = 'Electrical Buyer';
          } else if (dominantCategory.includes('food')) {
            userType = 'Food & Beverage Buyer';
          }
        }

        // Delivery mode preference (most common)
        const topDeliveryMode = Array.from(stats.deliveryModes.entries())
          .sort((a, b) => b[1] - a[1])[0];
        const deliveryModePreference =
          topDeliveryMode && topDeliveryMode[1] / stats.orderCount > 0.6
            ? topDeliveryMode[0]
            : null;

        // Region preferences (all regions user has ordered from)
        const regionPreferences = Array.from(stats.regions);

        // Price segment
        const avgOrderValue =
          stats.orderValues.reduce((a, b) => a + b, 0) / stats.orderValues.length;
        let priceSegment: 'budget' | 'mid' | 'premium' = 'mid';
        if (avgOrderValue < 200) {
          priceSegment = 'budget';
        } else if (avgOrderValue > 1000) {
          priceSegment = 'premium';
        }

        // Quality focused (avg rating ≥ 4.0)
        const avgRating =
          stats.ratings.length > 0
            ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length
            : 0;
        const qualityFocused = avgRating >= 4.0;

        // Prefers in-stock items (>70% of orders)
        const inStockCount = stats.inventoryStatuses.get('in_stock') || 0;
        const totalInventoryItems = Array.from(stats.inventoryStatuses.values()).reduce(
          (a, b) => a + b,
          0,
        );
        const prefersInStock =
          totalInventoryItems > 0 && inStockCount / totalInventoryItems > 0.7;

        // Order frequency
        let orderFrequency: 'occasional' | 'regular' | 'frequent' | 'vip' = 'occasional';
        if (stats.orderCount >= 10) {
          orderFrequency = 'vip';
        } else if (stats.orderCount >= 5) {
          orderFrequency = 'frequent';
        } else if (stats.orderCount >= 2) {
          orderFrequency = 'regular';
        }

        // Bulk buyer (avg quantity > 30)
        const avgQuantity =
          stats.quantities.length > 0
            ? stats.quantities.reduce((a, b) => a + b, 0) / stats.quantities.length
            : 0;
        const bulkBuyer = avgQuantity > 30;

        // Top vendors
        const topVendors = Array.from(stats.vendors.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([vendor]) => vendor);

        const profile: UserProfile = {
          userId,
          userType,
          preferredCategories: topCategories,
          preferredVendors: topVendors,
          deliveryModePreference,
          regionPreferences,
          priceSegment,
          qualityFocused,
          prefersInStock,
          orderFrequency,
          bulkBuyer,
          avgOrderValue,
          orderCount: stats.orderCount,
          avgQuantity,
          avgRating,
        };

        this.userProfiles.set(userId, profile);
      });

      this.logger.log(
        `✅ Analyzed ${this.userProfiles.size} user profiles with ${this.getProfileStats()}`,
      );
    } catch (error) {
      this.logger.error('Failed to analyze user profiles', error);
    }
  }

  private getProfileStats(): string {
    const profiles = Array.from(this.userProfiles.values());
    const qualityFocused = profiles.filter((p) => p.qualityFocused).length;
    const bulkBuyers = profiles.filter((p) => p.bulkBuyer).length;
    const vip = profiles.filter((p) => p.orderFrequency === 'vip').length;
    return `${qualityFocused} quality-focused, ${bulkBuyers} bulk buyers, ${vip} VIPs`;
  }

  private findDataFile(filename: string): string | null {
    const possiblePaths = [
      path.join(__dirname, '../data', filename),
      path.join(process.cwd(), 'src/data', filename),
      path.join(process.cwd(), 'server/src/data', filename),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return null;
  }

  getUserProfile(userId: string): UserProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  // Get personalization boosts based on user profile
  getPersonalizationBoosts(userId: string): {
    categories: string[];
    vendors: string[];
    regions: string[];
    minRating?: number;
    inventoryStatus?: string;
    deliveryMode?: string;
  } {
    const profile = this.getUserProfile(userId);
    if (!profile) {
      return {
        categories: [],
        vendors: [],
        regions: [],
      };
    }

    return {
      categories: profile.preferredCategories,
      vendors: profile.preferredVendors,
      regions: profile.regionPreferences,
      minRating: profile.qualityFocused ? 4.0 : undefined,
      inventoryStatus: profile.prefersInStock ? 'in_stock' : undefined,
      deliveryMode: profile.deliveryModePreference || undefined,
    };
  }
}

