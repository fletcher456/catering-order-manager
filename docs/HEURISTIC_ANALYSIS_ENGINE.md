# Heuristic Analysis Engine Documentation

## Overview

The Heuristic Analysis Engine (Phase 0) implements fractal self-similarity principles to analyze PDF menu structure through number classification, typography fingerprinting, and pattern extraction. This foundational analysis enables intelligent menu item triple identification by establishing document-wide consistency models.

## Core Architecture

### Bayesian Optimization Integration

**Purpose**: Automatically optimize heuristic parameters through intelligent parameter selection

#### Parameter Optimization Framework

```typescript
interface HeuristicOptimizationParameters {
  priceClassificationThreshold: number;      // 0.5-0.95 range
  typographyConsistencyWeight: number;       // 0.1-0.9 range
  economicClusteringTolerance: number;       // 0.1-0.5 range
  patternExtractionMinSupport: number;       // 0.2-0.8 range
  numberClassificationConfidence: number;    // 0.6-0.95 range
}

class OptimizedHeuristicEngine {
  private optimizationEngine: AdaptiveBayesianOptimizer;
  private currentParameters: HeuristicOptimizationParameters;
  
  async optimizeHeuristicParameters(documentFeatures: DocumentFeatures): Promise<HeuristicOptimizationParameters> {
    const parameterSpace = this.defineHeuristicParameterSpace();
    
    return await this.optimizationEngine.optimize({
      parameterSpace,
      objectiveFunction: (params) => this.evaluateHeuristicPerformance(params, documentFeatures),
      maxEvaluations: 20,
      convergenceThreshold: 0.02
    });
  }
  
  private evaluateHeuristicPerformance(params: HeuristicOptimizationParameters, features: DocumentFeatures): number {
    // Apply parameters to heuristic analysis
    const results = this.runHeuristicAnalysisWithParameters(params, features);
    
    // Multi-objective scoring
    return 0.4 * results.classificationAccuracy +
           0.3 * results.typographyConsistency +
           0.2 * results.patternExtractionQuality +
           0.1 * results.processingSpeed;
  }
}
```

### Number Classification System

**Purpose**: Distinguish between prices, counts, calories, measurements, and item numbers using optimized contextual heuristics

#### Classification Categories

**Price Detection**:
```typescript
interface PriceHeuristics {
  pattern: /^\$?\d+\.?\d{0,2}$/;
  range: { min: 0.5, max: 200 };
  confidence: 0.9;
  reasoning: "Currency format with reasonable restaurant pricing range";
}
```

**Calorie Identification**:
```typescript
interface CalorieHeuristics {
  range: { min: 100, max: 2000 };
  suffixPatterns: ['cal', 'kcal', 'calories'];
  confidence: 0.85;
  reasoning: "Large number with calorie suffix in typical range";
}
```

**Measurement Recognition**:
```typescript
interface MeasurementHeuristics {
  unitPatterns: /\d+\s*(oz|lb|"|'|inch|foot|liter|ml)/i;
  confidence: 0.8;
  reasoning: "Number followed by measurement unit";
}
```

**Count Classification**:
```typescript
interface CountHeuristics {
  range: { max: 20 };
  isInteger: true;
  excludesCurrency: true;
  confidence: 0.6;
  reasoning: "Small integer without currency symbols";
}
```

**Item Number Detection**:
```typescript
interface ItemNumberHeuristics {
  patterns: [/^#?\d+$/, /No\.\s*\d+/i];
  confidence: 0.7;
  reasoning: "Sequential number with prefix patterns";
}
```

#### Economic Clustering Analysis

**Purpose**: Group numbers by logical restaurant pricing categories

**Implementation Strategy**:
1. Collect all potential price values from document
2. Apply K-means clustering to identify price ranges
3. Validate clusters against restaurant category expectations
4. Assign confidence scores based on cluster coherence

**Expected Clusters**:
- Appetizer range: $4-$15
- Main course range: $12-$35
- Dessert range: $6-$12
- Beverage range: $2-$8

### Typography Fingerprinting System

**Purpose**: Build structural consistency models for different element types (names, descriptions, prices)

#### Fingerprint Construction

**Typography Grouping Algorithm**:
```typescript
interface TypographyFingerprint {
  fontFamily: string;        // Primary font identifier
  fontSize: number;          // Typical size for element type
  fontWeight: string;        // Weight consistency pattern
  avgLength: number;         // Average character count
  commonPatterns: string[];  // Regex patterns for content
  confidence: number;        // Sample size reliability score
}
```

**Grouping Key Strategy**:
- Combine font name, size, and weight into unique keys
- Minimum 3 samples required for reliable fingerprint
- Confidence scaling based on sample size (max at 10+ samples)

#### Pattern Recognition Algorithms

**Menu Vocabulary Detection**:
```typescript
const menuPatterns = [
  /\b(served|with|topped|fresh|grilled|fried|baked)\b/i,  // Preparation terms
  /\$\d+\.\d{2}/,                                         // Price patterns
  /\b\d+\s*(oz|lb)\b/i,                                   // Portion sizes
  /\b(appetizer|entree|dessert|beverage)\b/i              // Category terms
];
```

**Confidence Thresholds**:
- Pattern must appear in 30%+ of samples for inclusion
- Higher frequency patterns receive higher confidence scores
- Cross-validation against known menu vocabulary

### Pattern Extraction Framework

**Purpose**: Identify recurring structural templates for fractal propagation

#### Fractal Template Identification

**Template Components**:
1. **Spatial Relationships**: Relative positioning of name/description/price
2. **Typography Consistency**: Font patterns within element types
3. **Content Structure**: Length relationships and complexity patterns
4. **Confidence Metrics**: Reliability scores for template application

**Template Extraction Process**:
1. Identify high-confidence regions from spatial clustering
2. Analyze internal structure and relationships
3. Extract generalizable patterns for similar regions
4. Validate templates against document-wide consistency

#### Self-Similarity Propagation

**Fractal Application Strategy**:
- Apply successful templates to similar spatial configurations
- Scale confidence based on template match quality
- Iteratively refine templates with new successful extractions
- Cross-validate results against established patterns

## Implementation Algorithms

### Phase 0 Analysis Workflow

```typescript
class HeuristicAnalysisEngine {
  performHeuristicAnalysis(pageData: PageData[]): void {
    // Step 1: Number Classification
    const allNumbers = this.extractAllNumbers(pageData);
    this.numberClassifications = allNumbers.map(num => 
      this.classifyNumber(num.value, num.text, num.item)
    );
    
    // Step 2: Typography Fingerprinting
    this.buildTypographyFingerprints(pageData);
    
    // Step 3: Pattern Extraction
    this.extractStructuralPatterns(pageData);
  }
}
```

### Number Extraction Pipeline

**Multi-Pattern Recognition**:
```typescript
private extractNumbers(text: string): number[] {
  const patterns = [
    /\$\d+\.?\d*/g,          // Currency patterns
    /\d+\.?\d*\s*cal/gi,     // Calorie patterns
    /\d+\s*(oz|lb)/gi,       // Measurement patterns
    /\d+\.?\d*/g             // General numbers
  ];
  
  // Combine and deduplicate results
  const allMatches = patterns.flatMap(pattern => 
    [...text.matchAll(pattern)]
  );
  
  return this.deduplicateAndParse(allMatches);
}
```

### Typography Analysis Implementation

**Consistency Validation**:
```typescript
private buildTypographyFingerprints(pageData: PageData[]): void {
  const typeGroups = new Map<string, TextItem[]>();
  
  // Group by typography characteristics
  for (const page of pageData) {
    for (const item of page.textItems) {
      const key = `${item.fontName}-${item.fontSize}-${item.fontWeight}`;
      if (!typeGroups.has(key)) {
        typeGroups.set(key, []);
      }
      typeGroups.get(key)!.push(item);
    }
  }
  
  // Build fingerprints for significant groups
  for (const [key, items] of typeGroups) {
    if (items.length >= 3) {  // Minimum sample threshold
      const fingerprint = this.createFingerprint(items);
      this.typographyProfiles.set(key, fingerprint);
    }
  }
}
```

## Validation Framework

### Cross-Validation Mechanisms

**Document-Wide Consistency Checks**:
1. **Price Distribution Validation**: Ensure prices follow expected economic patterns
2. **Typography Consistency**: Verify same element types use consistent fonts
3. **Pattern Coherence**: Validate extracted patterns against document structure
4. **Confidence Correlation**: Higher confidence regions should show better consistency

### Quality Metrics

**Classification Accuracy Indicators**:
- Price detection rate vs. manual validation
- False positive rates for non-price numbers
- Typography fingerprint stability across document
- Pattern template success rates

**Confidence Scoring Framework**:
```typescript
interface ConfidenceMetrics {
  patternSimilarity: number;     // 0.0-1.0 match to established templates
  typographyConsistency: number; // 0.0-1.0 font consistency score
  spatialRelationship: number;   // 0.0-1.0 positioning pattern match
  contentValidation: number;     // 0.0-1.0 heuristic rule compliance
  crossReference: number;        // 0.0-1.0 document-wide consistency
}
```

## Integration Points

### Input Requirements
- Enhanced TextItem structures with typography metadata
- Page-level spatial organization
- Error handling callbacks for processing failures

### Output Specifications
```typescript
interface HeuristicAnalysisResult {
  numberClassifications: NumberClassification[];
  typographyProfiles: Map<string, TypographyFingerprint>;
  documentPatterns: StructuralPattern[];
  confidenceMetrics: QualityMetrics;
  processingLog: string[];
}
```

### Handoff to Spatial Clustering
- Enhanced text items with classification metadata
- Typography consistency models for region validation
- Pattern templates for fractal application
- Confidence baselines for quality assessment

## Performance Considerations

### Computational Complexity
- Number classification: O(n) where n = text items
- Typography fingerprinting: O(n log n) for grouping operations
- Pattern extraction: O(k²) where k = high-confidence regions

### Memory Optimization
- Streaming number extraction to avoid large intermediate arrays
- Efficient Map structures for typography grouping
- Lazy pattern evaluation for large documents

### Scalability Thresholds
- Typography fingerprinting becomes more reliable with larger documents
- Pattern extraction quality improves with diverse menu content
- Confidence scoring adapts to document complexity

## Error Handling and Recovery

### Graceful Degradation Strategies
- Continue processing with reduced confidence when patterns fail
- Fallback to basic heuristics when advanced analysis fails
- Preserve partial results for user review and correction

### Diagnostic Information
- Classification reasoning chains for debugging
- Typography group statistics for quality assessment
- Pattern extraction success rates for system tuning

## Future Enhancement Opportunities

### Advanced Classification
- Machine learning integration for improved number classification
- Context-aware pattern recognition using surrounding text
- Multi-language support for international menus

### Enhanced Pattern Recognition
- Semantic analysis of menu vocabulary
- Cross-restaurant pattern learning and template sharing
- Dynamic adaptation to new menu formats and styles