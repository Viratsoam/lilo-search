import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface UserTypeProfile {
  type: string;
  preferredCategories: string[];
  preferredVendors: string[];
  avgOrderValue: number;
  typicalRegions: string[];
}

@Injectable()
export class UserTypeService {
  private readonly logger = new Logger(UserTypeService.name);
  private userTypes: Map<string, UserTypeProfile> = new Map();
  private userToTypeMap: Map<string, string> = new Map();

  constructor() {
    this.analyzeUserTypes();
  }

  private analyzeUserTypes() {
    try {
      // Load orders to analyze user behavior
      const possiblePaths = [
        path.join(__dirname, '../data/orders.json'),
        path.join(process.cwd(), 'src/data/orders.json'),
        path.join(process.cwd(), 'server/src/data/orders.json'),
      ];

      let ordersPath: string | null = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          ordersPath = p;
          break;
        }
      }

      if (!ordersPath) {
        this.logger.warn('Orders file not found, user type analysis skipped');
        return;
      }

      const orders: any[] = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
      
      // Load products to get category information
      const productsPaths = [
        path.join(__dirname, '../data/products.json'),
        path.join(process.cwd(), 'src/data/products.json'),
        path.join(process.cwd(), 'server/src/data/products.json'),
      ];

      let productsPath: string | null = null;
      for (const p of productsPaths) {
        if (fs.existsSync(p)) {
          productsPath = p;
          break;
        }
      }

      if (!productsPath) {
        this.logger.warn('Products file not found, user type analysis skipped');
        return;
      }

      const products: any[] = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
      const productMap = new Map(products.map((p) => [p._id, p]));

      // Analyze each user's behavior
      const userStats = new Map<
        string,
        {
          categories: Map<string, number>;
          vendors: Map<string, number>;
          totalValue: number;
          orderCount: number;
          regions: Set<string>;
        }
      >();

      orders.forEach((order) => {
        const userId = order.user_id;
        if (!userStats.has(userId)) {
          userStats.set(userId, {
            categories: new Map(),
            vendors: new Map(),
            totalValue: 0,
            orderCount: 0,
            regions: new Set(),
          });
        }

        const stats = userStats.get(userId)!;
        stats.orderCount++;

        order.cart?.items?.forEach((item: any) => {
          const product = productMap.get(item.product_id);
          if (product) {
            // Count categories
            const category = product.category || 'Uncategorized';
            const categoryKey = category.split('>')[0].trim(); // Top-level category
            stats.categories.set(
              categoryKey,
              (stats.categories.get(categoryKey) || 0) + (item.quantity || 1),
            );

            // Count vendors
            if (product.vendor) {
              stats.vendors.set(
                product.vendor,
                (stats.vendors.get(product.vendor) || 0) + 1,
              );
            }
          }

          stats.totalValue += (item.price || 0) * (item.quantity || 1);
        });

        // Track regions (if available in products)
        // This would need product region data
      });

      // Classify users into types based on their behavior
      userStats.forEach((stats, userId) => {
        const topCategories = Array.from(stats.categories.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat]) => cat);

        const topVendors = Array.from(stats.vendors.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([vendor]) => vendor);

        const avgOrderValue = stats.totalValue / stats.orderCount;

        // Determine user type based on dominant category
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

        // Store user type mapping
        this.userToTypeMap.set(userId, userType);

        // Build or update user type profile
        if (!this.userTypes.has(userType)) {
          this.userTypes.set(userType, {
            type: userType,
            preferredCategories: [],
            preferredVendors: [],
            avgOrderValue: 0,
            typicalRegions: [],
          });
        }

        const typeProfile = this.userTypes.get(userType)!;
        // Aggregate category preferences
        topCategories.forEach((cat) => {
          if (!typeProfile.preferredCategories.includes(cat)) {
            typeProfile.preferredCategories.push(cat);
          }
        });

        // Aggregate vendor preferences
        topVendors.forEach((vendor) => {
          if (!typeProfile.preferredVendors.includes(vendor)) {
            typeProfile.preferredVendors.push(vendor);
          }
        });

        typeProfile.avgOrderValue =
          (typeProfile.avgOrderValue + avgOrderValue) / 2;
      });

      this.logger.log(
        `📊 Analyzed ${userStats.size} users into ${this.userTypes.size} user types`,
      );
      this.logger.log(
        `User types: ${Array.from(this.userTypes.keys()).join(', ')}`,
      );
    } catch (error) {
      this.logger.warn('Failed to analyze user types', error);
    }
  }

  getUserType(userId: string): string | null {
    return this.userToTypeMap.get(userId) || null;
  }

  getUserTypeProfile(userType: string): UserTypeProfile | null {
    return this.userTypes.get(userType) || null;
  }

  getPreferredCategoriesForUser(userId: string): string[] {
    const userType = this.getUserType(userId);
    if (!userType) return [];

    const profile = this.getUserTypeProfile(userType);
    return profile?.preferredCategories || [];
  }

  getPreferredVendorsForUser(userId: string): string[] {
    const userType = this.getUserType(userId);
    if (!userType) return [];

    const profile = this.getUserTypeProfile(userType);
    return profile?.preferredVendors || [];
  }

  getAllUserTypes(): string[] {
    return Array.from(this.userTypes.keys());
  }
}

