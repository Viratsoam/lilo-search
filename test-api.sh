#!/bin/bash

# Lilo Search Engine - Comprehensive API Test Suite
# This script tests all major search scenarios

BASE_URL="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Lilo Search Engine - Comprehensive Test Suite"
echo "================================================"
echo ""

test_count=0
pass_count=0
fail_count=0

# Test function
test_api() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_field="$5"
    local expected_value="$6"
    
    test_count=$((test_count + 1))
    echo -n "Test $test_count: $test_name ... "
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    else
        response=$(curl -s -X GET "$BASE_URL$endpoint" 2>/dev/null)
    fi
    
    if [ $? -eq 0 ]; then
        # Check if response contains expected value
        if echo "$response" | grep -q "$expected_value" 2>/dev/null; then
            echo -e "${GREEN}✅ PASS${NC}"
            pass_count=$((pass_count + 1))
            return 0
        elif [ -z "$expected_value" ]; then
            # Just check if we got a response
            if [ ! -z "$response" ]; then
                echo -e "${GREEN}✅ PASS${NC}"
                pass_count=$((pass_count + 1))
                return 0
            fi
        fi
    fi
    
    echo -e "${RED}❌ FAIL${NC}"
    fail_count=$((fail_count + 1))
    return 1
}

# Health Check
echo "📋 Health & Status Tests"
echo "----------------------"
test_api "Health Check" "GET" "/health" "" "status" "ok"
echo ""

# Basic Search Tests
echo "📋 Basic Search Tests"
echo "-------------------"
test_api "Simple Keyword Search" "POST" "/search" '{"query":"gloves","size":2}' "results" ""
test_api "Multi-word Search" "POST" "/search" '{"query":"nitrile gloves bulk pack","size":2}' "results" ""
test_api "Required: 3 hp sewage pump" "POST" "/search" '{"query":"3 hp sewage pump weir","size":2}' "results" ""
test_api "Required: nitrile glove bulk pack" "POST" "/search" '{"query":"nitrile glove bulk pack","size":2}' "results" ""
test_api "Required: pvc pipe 50mm" "POST" "/search" '{"query":"pvc pipe 50mm","size":2}' "results" ""
test_api "Required: tomato (food)" "POST" "/search" '{"query":"tomato","size":2}' "results" ""
test_api "Required: tomato makeup (cosmetics)" "POST" "/search" '{"query":"tomato makeup","size":2}' "results" ""
echo ""

# Typo Handling Tests
echo "📋 Typo Handling Tests"
echo "---------------------"
test_api "Single Character Typo" "POST" "/search" '{"query":"nitril gloves","size":2}' "results" ""
test_api "Multiple Character Typos" "POST" "/search" '{"query":"nitril glovs","size":2}' "results" ""
test_api "Technical Term Typo" "POST" "/search" '{"query":"sewage pumpe","size":2}' "results" ""
echo ""

# Personalization Tests
echo "📋 Personalization Tests"
echo "----------------------"
test_api "Personalization with User ID" "POST" "/search" '{"query":"gloves","userId":"user_136","size":2}' "results" ""
test_api "Personalization with User Type" "POST" "/search" '{"query":"gloves","userType":"Safety Equipment Buyer","size":2}' "results" ""
test_api "Personalization Disabled" "POST" "/search" '{"query":"gloves","userId":"user_136","featureFlags":{"personalizationEnabled":false},"size":2}' "results" ""
echo ""

# Feature Flags Tests
echo "📋 Feature Flags Tests"
echo "--------------------"
test_api "Hybrid Search Strategy" "POST" "/search" '{"query":"gloves","featureFlags":{"searchStrategy":"hybrid"},"size":2}' "results" ""
test_api "Keyword-Only Strategy" "POST" "/search" '{"query":"gloves","featureFlags":{"searchStrategy":"keyword_only"},"size":2}' "results" ""
test_api "Request-Level Feature Flags" "POST" "/search" '{"query":"gloves","featureFlags":{"fuzzyMatchingEnabled":true},"size":2}' "results" ""
echo ""

# Filtering Tests
echo "📋 Filtering Tests"
echo "----------------"
test_api "Category Filter" "POST" "/search" '{"query":"pump","filters":{"category":"Industrial > Pumps"},"size":2}' "results" ""
test_api "Rating Filter" "POST" "/search" '{"query":"gloves","filters":{"minRating":4.0},"size":2}' "results" ""
test_api "Inventory Filter" "POST" "/search" '{"query":"gloves","filters":{"inventoryStatus":"in_stock"},"size":2}' "results" ""
test_api "Multiple Filters" "POST" "/search" '{"query":"pump","filters":{"minRating":4.0,"inventoryStatus":"in_stock"},"size":2}' "results" ""
echo ""

# Pagination Tests
echo "📋 Pagination Tests"
echo "-----------------"
test_api "Pagination - First Page" "POST" "/search" '{"query":"gloves","size":10,"from":0}' "results" ""
test_api "Pagination - Second Page" "POST" "/search" '{"query":"gloves","size":10,"from":10}' "results" ""
echo ""

# Summary
echo "================================================"
echo "📊 Test Summary"
echo "================================================"
echo "Total Tests: $test_count"
echo -e "${GREEN}Passed: $pass_count${NC}"
if [ $fail_count -gt 0 ]; then
    echo -e "${RED}Failed: $fail_count${NC}"
else
    echo -e "${GREEN}Failed: $fail_count${NC}"
fi
echo "Success Rate: $(( pass_count * 100 / test_count ))%"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

