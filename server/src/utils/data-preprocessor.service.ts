import { Injectable } from '@nestjs/common';

@Injectable()
export class DataPreprocessorService {
  // Unit normalization mapping
  private readonly unitNormalizations: Record<string, string> = {
    'kg': 'kilogram',
    'kg.': 'kilogram',
    'kilograms': 'kilogram',
    'lbs': 'pound',
    'lb': 'pound',
    'pounds': 'pound',
    'oz': 'ounce',
    'ounces': 'ounce',
    'grams': 'gram',
    'g': 'gram',
    'liters': 'liter',
    'litres': 'liter',
    'litre': 'liter',
    'l': 'liter',
    'lt': 'liter',
    'gallons': 'gallon',
    'gal': 'gallon',
    'pcs': 'pieces',
    'pieces': 'pieces',
  };

  // Normalize unit of measure
  normalizeUnit(unit: string | null | undefined): string {
    if (!unit) return 'unit';
    
    const normalized = unit.toLowerCase().trim();
    return this.unitNormalizations[normalized] || normalized;
  }

  // Normalize category hierarchy
  normalizeCategory(category: string | null | undefined): string {
    if (!category) return 'Uncategorized';
    
    // Handle inconsistent separators (>, >>, etc.)
    return category
      .replace(/>+/g, '>')
      .replace(/\s*>\s*/g, ' > ')
      .trim();
  }

  // Clean and normalize text
  cleanText(text: string | null | undefined): string {
    if (!text) return '';
    
    return text
      .replace(/###|\$\$|%%|@@/g, '') // Remove noise characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Normalize attribute keys (handle typos like "bulkaPck" -> "bulk_pack")
  normalizeAttributeKey(key: string): string {
    const keyMap: Record<string, string> = {
      'bulkapck': 'bulk_pack',
      'bulkapack': 'bulk_pack',
      'bulkpack': 'bulk_pack',
      'opwer_hp': 'power_hp',
      'coolr': 'color',
      'diametr_mm': 'diameter_mm',
      'diametr': 'diameter',
    };

    const normalized = key.toLowerCase().replace(/[_-]/g, '');
    return keyMap[normalized] || key.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  // Extract and normalize attributes
  normalizeAttributes(attributes: any): Record<string, any> {
    if (!attributes || typeof attributes !== 'object') return {};

    const normalized: Record<string, any> = {};
    for (const [key, value] of Object.entries(attributes)) {
      const normalizedKey = this.normalizeAttributeKey(key);
      normalized[normalizedKey] = value;
    }
    return normalized;
  }

  // Generate searchable text from product
  generateSearchableText(product: any): string {
    const parts = [
      product.title,
      product.description,
      product.vendor,
      product.sku,
      product.category,
      ...Object.values(this.normalizeAttributes(product.attributes || {})),
    ].filter(Boolean);

    return parts.join(' ').toLowerCase();
  }

  // Normalize bulk pack size
  normalizeBulkPackSize(size: string | null | undefined): string {
    if (!size) return '';
    
    return size
      .toLowerCase()
      .replace(/half-dozen/g, '6 pcs')
      .replace(/dozen/g, '12 pcs')
      .trim();
  }
}

