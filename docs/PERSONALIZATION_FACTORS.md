# Personalization Factors

This document describes all the personalization factors implemented in the search engine based on data analysis.

## Overview

The search engine uses **10 different personalization factors** to customize search results for each user. These factors are automatically analyzed from order history and applied when a `userId` is provided.

## Personalization Factors

### 1. User Type (2.5x boost)
**What it is:** Classifies users into categories based on their dominant purchasing patterns.

**Types:**
- Safety Equipment Buyer
- Industrial Equipment Buyer
- Tools Buyer
- Chemicals Buyer
- Electrical Buyer
- Food & Beverage Buyer
- General Buyer

**How it works:** Analyzes order history to identify the most frequently purchased category and assigns a user type. Products in preferred categories get a 2.5x boost.

---

### 2. Preferred Vendors (1.8x boost)
**What it is:** Identifies vendors that a user frequently orders from.

**How it works:** Tracks vendor frequency in order history. Top 5 vendors get a 1.8x boost.

**Data:** All users have vendor preferences based on their order history.

---

### 3. Region Preferences (1.5x boost)
**What it is:** Identifies geographic regions where users typically order products from.

**Regions:** BR (Brazil), MX (Mexico), ES (Spain), etc.

**How it works:** Tracks `region_availability` from products in order history. Products available in preferred regions get a 1.5x boost.

**Data:** 174 users have region preferences.

---

### 4. Quality Focus (1.3x boost)
**What it is:** Identifies users who consistently order high-rated products.

**How it works:** Calculates average `supplier_rating` from user's order history. If average ≥ 4.0, user is considered "quality-focused". High-rated products (≥4.0) get a 1.3x boost.

**Data:** 56 users are quality-focused.

---

### 5. Inventory Preference (1.2x boost)
**What it is:** Identifies users who prefer in-stock items.

**How it works:** Tracks `inventory_status` from order history. If >70% of orders are for `in_stock` items, user prefers in-stock. In-stock products get a 1.2x boost.

**Data:** 63 users prefer in-stock items.

---

### 6. Price Segment (1.1x boost)
**What it is:** Classifies users into budget, mid, or premium segments based on average order value.

**Segments:**
- **Budget:** Average order value < $200
- **Mid:** $200 - $1000
- **Premium:** > $1000

**How it works:** Calculates average order value from history. Premium buyers get a slight boost for higher-rated products (as proxy for quality/price).

**Data:** 8 budget users, 5 premium users.

---

### 7. Order History (3.0x boost - STRONGEST)
**What it is:** Products that the user has previously ordered.

**How it works:** Tracks all product IDs from user's order history. Previously ordered products get the strongest boost (3.0x).

**Why strongest:** Direct signal of user preference.

---

### 8. Delivery Mode Preference
**What it is:** Identifies user's preferred delivery method.

**Modes:** Express, Drop-Ship, Pick-up, Standard

**How it works:** Tracks delivery mode frequency. If one mode is used >60% of the time, it's considered a preference.

**Data:** 5 users have strong delivery preferences.

**Note:** Currently tracked but not yet used for boosting (can be added as filter or boost).

---

### 9. Order Frequency
**What it is:** Classifies users by how often they order.

**Categories:**
- **Occasional:** 1 order
- **Regular:** 2-4 orders
- **Frequent:** 5-9 orders
- **VIP:** ≥10 orders

**Data:** 20 VIP users identified.

**Note:** Currently tracked but can be used for special VIP boosts or filters.

---

### 10. Bulk Buying Patterns
**What it is:** Identifies users who typically order large quantities.

**How it works:** Calculates average quantity per order. If average > 30, user is a "bulk buyer".

**Data:** 47 bulk buyers identified.

**Note:** Currently tracked but can be used to boost bulk-pack products or adjust recommendations.

---

## Boost Hierarchy

The personalization boosts are applied in the following order (strongest to weakest):

1. **Order History** (3.0x) - Previously ordered products
2. **User Type Categories** (2.5x) - Preferred categories
3. **Preferred Vendors** (1.8x) - Top vendors
4. **Region Preferences** (1.5x) - Preferred regions
5. **Quality Focus** (1.3x) - High-rated products
6. **Inventory Preference** (1.2x) - In-stock items
7. **Price Segment** (1.1x) - Premium buyers

## Usage

### Automatic Personalization
When a `userId` is provided, all applicable factors are automatically applied:

```bash
POST /search
Content-Type: application/json
{
  "query": "gloves",
  "userId": "user_136",
  "size": 20
}
```

### Explicit User Type
You can also explicitly set a user type:

```bash
POST /search
Content-Type: application/json
{
  "query": "gloves",
  "userType": "Safety Equipment Buyer",
  "size": 20
}
```

### Combined
Both can be used together (user type + order history):

```bash
POST /search
Content-Type: application/json
{
  "query": "gloves",
  "userId": "user_136",
  "userType": "Safety Equipment Buyer",
  "size": 20
}
```

## Data Analysis Summary

From analyzing 1,000 orders and 10,000 products:

- **174 users** have region preferences
- **56 users** are quality-focused (avg rating ≥ 4.0)
- **63 users** prefer in-stock items
- **20 users** are VIP (≥10 orders)
- **47 users** are bulk buyers (avg qty > 30)
- **5 users** have strong delivery preferences (>60%)
- **8 budget** and **5 premium** price segments

## Future Enhancements

1. **Delivery Mode Boosting:** Boost products that support preferred delivery modes
2. **VIP Boosts:** Additional boosts for frequent/VIP users
3. **Bulk Pack Boosting:** Boost bulk-pack products for bulk buyers
4. **Time-based Patterns:** Boost products based on seasonal or time-of-day patterns
5. **Collaborative Filtering:** "Users who bought X also bought Y" recommendations

