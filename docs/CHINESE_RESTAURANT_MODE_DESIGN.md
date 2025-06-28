# Chinese Restaurant Mode Design Document

## Overview

Chinese restaurant menus often follow a simplified **name/price** pattern instead of the traditional **name/description/price** triple commonly found in Western restaurants. This mode requires fundamental changes to parsing algorithms, UI patterns, optimization parameters, and validation logic to accommodate this structural difference.

## Problem Analysis

### Traditional Western Menu Pattern
```
Grilled Salmon Fillet                     $24.95
Fresh Atlantic salmon with lemon butter sauce,
served with seasonal vegetables and rice pilaf
```

### Chinese Restaurant Pattern
```
宫保鸡丁 Kung Pao Chicken                  $12.95
麻婆豆腐 Mapo Tofu                         $10.95
红烧肉 Red Braised Pork                    $15.95
```

### Key Differences
1. **No description text** - eliminates middle element of traditional triple
2. **Bilingual naming** - often includes Chinese characters with English translation
3. **Simpler spatial layout** - typically two-column format (name + price)
4. **Different typography patterns** - mixed character sets affect font analysis
5. **Shorter text blocks** - impacts clustering and region detection algorithms

## Required Changes

### 1. User Interface Modifications

#### Toggle Control Addition
- **Location**: PDFUploader component header area
- **Control Type**: Switch/toggle button with clear labeling
- **States**: 
  - `false` (default): "Standard Menu Mode"
  - `true`: "Chinese Restaurant Mode"
- **Persistence**: Store in component state, pass down to parser

#### Visual Feedback Changes
- **Processing Messages**: Update to reflect simplified parsing expectations
- **Region Validation Display**: Show name/price pairs instead of triples
- **Confidence Scoring**: Adjust visual indicators for two-element validation

### 2. Core Algorithm Modifications

#### Phase 0: Heuristic Analysis Engine
**File**: `src/utils/pdfParser.ts` - `performHeuristicAnalysis()`

**Changes Required**:
- **Number Classification**: Maintain existing price detection but remove description-based context validation
- **Typography Fingerprinting**: 
  - Build fingerprints for name and price elements only
  - Account for mixed character sets (Chinese + English)
  - Adjust pattern extraction for bilingual text
- **Structural Pattern Extraction**:
  - Modify `StructuralPattern` interface to support optional description fingerprint
  - Update spatial relationship mapping to exclude description positioning
  - Implement name-to-price direct relationship analysis

#### Phase 1: Spatial Clustering Algorithm
**File**: `src/utils/pdfParser.ts` - `detectMenuRegions()`

**Changes Required**:
- **Horizontal Band Clustering**: Adjust for simpler two-element layout
- **Region Confidence Scoring**: 
  - Remove description-based validation metrics
  - Increase weight on name-price spatial consistency
  - Add bilingual text detection scoring
- **X-Coordinate Clustering**: Optimize for two-column layout patterns

#### Phase 2: Region Processing & Validation
**File**: `src/utils/pdfParser.ts` - `processAndValidateRegions()`

**Changes Required**:
- **Heuristic Validation**: 
  - Skip description complexity validation
  - Focus on name uniqueness and price validity
  - Add Chinese character detection validation
- **Region Quality Assessment**:
  - Adjust quality thresholds for simpler structure
  - Modify dimensional constraints for compact layouts

#### Phase 3: Menu Item Assembly
**File**: `src/utils/pdfParser.ts` - `assembleMenuItems()`

**Changes Required**:
- **Triple Parsing**: Convert to **pair parsing** with optional description fallback
- **Validation Weights**: 
  - Remove description validation component
  - Increase name and price validation weights proportionally
- **Bootstrap Fallback**: Simplify to name/price extraction pattern

### 3. Type System Updates

#### Core Interface Modifications
**File**: `src/types.ts`

**Required Changes**:
```typescript
// Add mode flag to processing state
export interface ProcessingState {
  phase: string;
  progress: number;
  message: string;
  chineseRestaurantMode?: boolean; // NEW
  optimizationIteration?: number;
  currentParameters?: Partial<OptimizationParameters>;
  metrics?: Partial<ProcessingMetrics>;
}

// Update MenuItem interface
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string; // Make truly optional for Chinese mode
  category: string;
  servingSize?: number;
  regionImage?: string;
  confidence?: number;
  extractionMetadata?: {
    sourceRegion: MenuRegion;
    processingPhase: string;
    optimizationParameters: Partial<OptimizationParameters>;
    chineseRestaurantMode?: boolean; // NEW
  };
}

// Update StructuralPattern for optional description
export interface StructuralPattern {
  nameFingerprint: TypographyFingerprint;
  descriptionFingerprint?: TypographyFingerprint; // Make optional
  priceFingerprint: TypographyFingerprint;
  spatialRelationships: {
    nameToDescription?: { dx: number; dy: number; tolerance: number }; // Optional
    descriptionToPrice?: { dx: number; dy: number; tolerance: number }; // Optional
    nameToPrice: { dx: number; dy: number; tolerance: number }; // Required
  };
  confidence: number;
  mode: 'standard' | 'chinese'; // NEW
}
```

### 4. Bayesian Optimization Parameter Adjustments

#### Modified Parameter Space
**File**: `src/utils/bayesianOptimizer.ts` - `defineParameterBounds()`

**Changes Required**:
- **Phase 0 Parameters**: Add Chinese character detection weights
- **Phase 1 Parameters**: Adjust confidence weights for two-element validation
- **Phase 2 Parameters**: Modify heuristic validation weights to exclude description
- **Phase 3 Parameters**: Update triple parsing weights to pair parsing weights

#### New Parameter Categories
```typescript
interface ChineseModeSpatialOptimizationParameters extends SpatialOptimizationParameters {
  confidenceWeights: {
    textLengthVariety: number;
    pricePattern: number;
    itemCount: number;
    typography: number;
    bilingualConsistency: number; // NEW
  };
  nameToDirectPriceWeight: number; // NEW
}

interface ChineseModeAssemblyOptimizationParameters extends AssemblyOptimizationParameters {
  pairParsingWeights: {
    nameValidation: number;
    priceValidation: number;
    bilingualValidation: number; // NEW
  };
  chineseCharacterDetectionThreshold: number; // NEW
}
```

### 5. Component Integration Changes

#### PDFUploader Component
**File**: `src/components/PDFUploader.tsx`

**Required Modifications**:
- Add toggle state management for Chinese restaurant mode
- Pass mode flag to parser initialization
- Update processing state messages for mode-specific feedback
- Modify optimization metrics display for simplified validation

#### CateringOrderForm Component
**File**: `src/components/CateringOrderForm.tsx`

**Required Modifications**:
- Handle menu items with optional descriptions gracefully
- Adjust display layout when descriptions are missing
- Update categorization logic for Chinese restaurant naming patterns

#### OrderSummary Component
**File**: `src/components/OrderSummary.tsx`

**Required Modifications**:
- Display menu items without descriptions properly
- Maintain readable formatting for bilingual item names
- Ensure export functionality works with simplified item structure

### 6. Algorithm Performance Optimizations

#### Memory Efficiency Improvements
- **Reduced Object Size**: Eliminate description storage and processing for Chinese mode
- **Simpler Validation**: Reduce computational overhead of triple validation
- **Optimized Clustering**: Fewer spatial relationship calculations required

#### Processing Speed Enhancements
- **Faster Region Detection**: Two-element patterns are computationally simpler
- **Reduced Bayesian Search Space**: Fewer parameters to optimize in Chinese mode
- **Simplified Assembly**: Direct name-price pairing eliminates description matching

### 7. Validation Logic Updates

#### Chinese Character Detection
```typescript
function containsChineseCharacters(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function validateBilingualName(name: string): {
  hasChineseChars: boolean;
  hasEnglishChars: boolean;
  isWellFormed: boolean;
} {
  // Implementation for bilingual name validation
}
```

#### Simplified Quality Metrics
- **Name Quality**: Focus on uniqueness, appropriate length, character set consistency
- **Price Quality**: Maintain existing economic clustering and currency validation
- **Layout Quality**: Two-column spatial consistency validation

### 8. Testing Strategy

#### Test Cases for Chinese Mode
1. **Pure Chinese Menus**: Traditional Chinese characters only
2. **Bilingual Menus**: Mixed Chinese/English naming
3. **Simplified Layouts**: Compact two-column designs
4. **Complex Typography**: Multiple font weights and sizes
5. **Edge Cases**: Very short names, unusual pricing formats

#### Performance Benchmarks
- **Parsing Speed**: Compare Chinese mode vs standard mode processing times
- **Accuracy Metrics**: Validate correct name/price extraction rates
- **Memory Usage**: Confirm reduced memory footprint
- **Optimization Convergence**: Ensure Bayesian optimization still converges effectively

### 9. Documentation Updates

#### User Documentation
- Add Chinese restaurant mode toggle explanation
- Provide examples of supported menu formats
- Document expected performance differences

#### Developer Documentation
- Update API documentation for new interfaces
- Document parameter space changes for optimization
- Add implementation notes for bilingual text handling

## Implementation Priority

### Phase 1: Core Infrastructure (High Priority)
1. Add toggle UI control
2. Update type definitions
3. Modify basic parsing logic for optional descriptions

### Phase 2: Algorithm Adaptation (Medium Priority)
1. Implement Chinese character detection
2. Update spatial clustering for two-element patterns
3. Modify Bayesian optimization parameter space

### Phase 3: Optimization & Testing (Lower Priority)
1. Performance tuning for Chinese mode
2. Comprehensive testing with real Chinese restaurant menus
3. Documentation and example gallery

## Risk Assessment

### Technical Risks
- **Character Encoding**: Potential issues with Chinese character rendering in PDF extraction
- **Font Detection**: Mixed character sets may complicate typography fingerprinting
- **Layout Assumptions**: Some Chinese menus may still include descriptions

### Mitigation Strategies
- **Robust Character Detection**: Implement multiple encoding detection methods
- **Fallback Mechanisms**: Maintain standard mode parsing as fallback option
- **User Feedback**: Provide clear indicators when mode selection may be incorrect

## Success Metrics

### Quantitative Goals
- **Parsing Accuracy**: >90% correct name/price extraction for Chinese restaurant menus
- **Processing Speed**: 20-30% faster than standard mode due to simplified structure
- **Memory Efficiency**: 15-25% reduction in memory usage
- **User Adoption**: Clear user preference indication through toggle usage analytics

### Qualitative Goals
- **User Experience**: Seamless toggle between modes with clear visual feedback
- **Maintainability**: Clean separation of mode-specific logic
- **Extensibility**: Framework for additional specialized menu formats in future