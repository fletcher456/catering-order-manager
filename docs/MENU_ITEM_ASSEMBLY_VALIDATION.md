# Menu Item Assembly & Validation Documentation

## Overview

The Menu Item Assembly & Validation layer transforms validated regions into structured menu items through triple parsing, bootstrapping convergence, and document-wide validation. This phase implements fractal self-similarity principles to achieve high-accuracy extraction through iterative pattern refinement and cross-validation.

## Architecture Components

### Bootstrapping Phase

**Purpose**: Ensure sufficient extraction quality through fallback processing and convergence analysis

#### Bootstrap Assessment Engine

**Quality Evaluation Metrics**:
```typescript
interface BootstrapAssessment {
  extractionCount: number;      // Total menu items extracted
  averageConfidence: number;    // Mean confidence across items
  coveragePercentage: number;   // Estimated menu coverage
  qualityThreshold: 0.7;       // Minimum acceptable quality
  minimumItems: 5;             // Baseline extraction requirement
}

private assessExtractionQuality(initialResults: MenuItem[]): BootstrapDecision {
  const metrics = this.calculateQualityMetrics(initialResults);
  
  const decision: BootstrapDecision = {
    requiresBootstrap: false,
    confidence: metrics.averageConfidence,
    reasoning: []
  };
  
  // Low extraction count check
  if (metrics.extractionCount < this.config.minimumItems) {
    decision.requiresBootstrap = true;
    decision.reasoning.push(`Low extraction count: ${metrics.extractionCount} < ${this.config.minimumItems}`);
  }
  
  // Quality threshold check
  if (metrics.averageConfidence < this.config.qualityThreshold) {
    decision.requiresBootstrap = true;
    decision.reasoning.push(`Low confidence: ${metrics.averageConfidence} < ${this.config.qualityThreshold}`);
  }
  
  // Coverage assessment
  if (metrics.coveragePercentage < 0.6) {
    decision.requiresBootstrap = true;
    decision.reasoning.push(`Insufficient coverage: ${metrics.coveragePercentage * 100}%`);
  }
  
  return decision;
}
```

#### Fallback Text Processing

**Traditional Pattern Matching**:
```typescript
interface FallbackProcessing {
  lineBasedParsing: boolean;    // Process text line by line
  patternMatching: RegExp[];    // Traditional menu item patterns
  basicTripleExtraction: boolean; // Simple name/price extraction
  supplementaryResults: boolean; // Merge with heuristic results
}

private processFallbackText(allText: string): MenuItem[] {
  const fallbackItems: MenuItem[] = [];
  const lines = allText.split('\n').filter(line => line.trim().length > 0);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Pattern 1: Price at end of line
    const endPriceMatch = line.match(/^(.+?)\s+\$(\d+\.?\d*)$/);
    if (endPriceMatch) {
      const [, nameDesc, priceStr] = endPriceMatch;
      const price = parseFloat(priceStr);
      
      fallbackItems.push(this.createFallbackItem(nameDesc, '', price, i));
      continue;
    }
    
    // Pattern 2: Price in middle with description following
    const midPriceMatch = line.match(/^(.+?)\s+\$(\d+\.?\d*)\s+(.+)$/);
    if (midPriceMatch) {
      const [, name, priceStr, description] = midPriceMatch;
      const price = parseFloat(priceStr);
      
      fallbackItems.push(this.createFallbackItem(name, description, price, i));
      continue;
    }
    
    // Pattern 3: Multi-line item with price on next line
    if (i < lines.length - 1) {
      const nextLine = lines[i + 1].trim();
      const nextPriceMatch = nextLine.match(/^\$(\d+\.?\d*)$/);
      if (nextPriceMatch) {
        const price = parseFloat(nextPriceMatch[1]);
        fallbackItems.push(this.createFallbackItem(line, '', price, i));
        i++; // Skip price line
        continue;
      }
    }
  }
  
  return this.validateFallbackItems(fallbackItems);
}
```

#### Bootstrap Reprocessing

**Enhanced Pattern Integration**:
```typescript
private reprocessWithBootstrapData(
  originalItems: MenuItem[], 
  fallbackItems: MenuItem[]
): MenuItem[] {
  // Merge and deduplicate
  const mergedItems = this.mergeItemCollections(originalItems, fallbackItems);
  
  // Extract enhanced patterns from fallback success
  const enhancedPatterns = this.extractPatternsFromFallback(fallbackItems);
  this.updateHeuristicPatterns(enhancedPatterns);
  
  // Apply heuristic validation to fallback items
  const validatedFallback = fallbackItems.map(item => 
    this.applyHeuristicValidation(item)
  );
  
  // Re-evaluate original items with enhanced patterns
  const revalidatedOriginal = originalItems.map(item =>
    this.revalidateWithEnhancedPatterns(item, enhancedPatterns)
  );
  
  return this.consolidateResults(revalidatedOriginal, validatedFallback);
}

private extractPatternsFromFallback(fallbackItems: MenuItem[]): EnhancedPattern[] {
  const patterns: EnhancedPattern[] = [];
  
  // Name length patterns
  const nameLengths = fallbackItems.map(item => item.name.length);
  patterns.push({
    type: 'name_length',
    range: { min: Math.min(...nameLengths), max: Math.max(...nameLengths) },
    confidence: 0.7
  });
  
  // Price range patterns
  const prices = fallbackItems.map(item => item.price).filter(p => p > 0);
  if (prices.length > 0) {
    patterns.push({
      type: 'price_range',
      range: { min: Math.min(...prices), max: Math.max(...prices) },
      confidence: 0.8
    });
  }
  
  // Category distribution patterns
  const categories = this.groupItemsByCategory(fallbackItems);
  patterns.push({
    type: 'category_distribution',
    distribution: categories,
    confidence: 0.6
  });
  
  return patterns;
}
```

#### Convergence Analysis

**Iterative Quality Improvement**:
```typescript
interface ConvergenceMetrics {
  iterationCount: number;
  qualityImprovement: number;   // Delta from previous iteration
  stabilityScore: number;       // Pattern consistency across iterations
  convergenceThreshold: 0.05;   // Minimum improvement for continuation
  maxIterations: 3;            // Prevent infinite loops
}

private analyzeConvergence(
  previousResults: MenuItem[], 
  currentResults: MenuItem[]
): ConvergenceResult {
  const metrics = this.calculateConvergenceMetrics(previousResults, currentResults);
  
  const result: ConvergenceResult = {
    hasConverged: false,
    shouldContinue: false,
    qualityDelta: metrics.qualityImprovement,
    recommendation: 'continue'
  };
  
  // Check for convergence
  if (metrics.qualityImprovement < this.config.convergenceThreshold) {
    result.hasConverged = true;
    result.recommendation = 'finalize';
  }
  
  // Check for iteration limits
  if (metrics.iterationCount >= this.config.maxIterations) {
    result.hasConverged = true;
    result.recommendation = 'timeout_finalize';
  }
  
  // Check for quality degradation
  if (metrics.qualityImprovement < -0.1) {
    result.hasConverged = true;
    result.recommendation = 'revert_to_previous';
  }
  
  // Determine continuation
  result.shouldContinue = !result.hasConverged && 
                         metrics.qualityImprovement > 0;
  
  return result;
}
```

### Triple Parsing Engine

**Purpose**: Extract structured name/description/price triples from validated regions

#### Component Identification Algorithm

**Multi-Strategy Extraction**:
```typescript
interface TripleExtractionStrategy {
  priceFirst: boolean;          // Identify price as anchor point
  spatialAnalysis: boolean;     // Use coordinate positioning
  typographyGuided: boolean;    // Font-based component identification
  lengthHeuristics: boolean;    // Name/description length relationships
}

private extractTripleComponents(region: MenuRegion): MenuItemTriple {
  const texts = region.items.map(item => item.text.trim()).filter(t => t.length > 0);
  
  let name = '';
  let description = '';
  let price = 0;
  
  // Strategy 1: Price-anchored extraction
  const priceText = this.findPriceText(texts);
  if (priceText) {
    price = this.extractPriceValue(priceText);
    const nonPriceTexts = texts.filter(t => t !== priceText);
    
    // Assign remaining texts based on length and position
    if (nonPriceTexts.length >= 1) {
      name = nonPriceTexts[0];
      if (nonPriceTexts.length > 1) {
        description = nonPriceTexts.slice(1).join(' ');
      }
    }
  } else {
    // Strategy 2: Position-based extraction
    const positionSorted = this.sortTextsByPosition(region.items);
    name = positionSorted[0]?.text || '';
    if (positionSorted.length > 1) {
      description = positionSorted.slice(1).map(item => item.text).join(' ');
    }
  }
  
  // Strategy 3: Typography-guided refinement
  const typographyRefinement = this.refineWithTypography(region, { name, description, price });
  
  return this.validateTriple(typographyRefinement);
}

private findPriceText(texts: string[]): string | null {
  // Use number classification results for confident price identification
  for (const text of texts) {
    const numbers = this.extractNumbers(text);
    for (const num of numbers) {
      const classification = this.getNumberClassification(num);
      if (classification?.type === 'price' && classification.confidence > 0.7) {
        return text;
      }
    }
  }
  
  // Fallback to pattern matching
  const pricePattern = /\$\d+\.?\d*/;
  return texts.find(text => pricePattern.test(text)) || null;
}
```

#### Typography-Guided Classification

**Font-Based Component Recognition**:
```typescript
private refineWithTypography(
  region: MenuRegion, 
  initialTriple: MenuItemTriple
): MenuItemTriple {
  const items = region.items;
  const refined = { ...initialTriple };
  
  // Find potential name elements (typically bold/larger font)
  const nameElements = items.filter(item => 
    item.fontWeight === 'bold' || 
    item.fontSize > this.calculateAverageFontSize(items) * 1.1
  );
  
  if (nameElements.length > 0 && nameElements[0].text !== refined.name) {
    // Typography suggests different name element
    const suggestedName = nameElements[0].text;
    
    // Validate against length heuristics
    if (suggestedName.length <= 50 && suggestedName.length >= 2) {
      refined.name = suggestedName;
      
      // Rebuild description from remaining elements
      const remainingTexts = items
        .filter(item => item !== nameElements[0])
        .filter(item => !this.isPriceText(item.text))
        .map(item => item.text);
      
      refined.description = remainingTexts.join(' ');
    }
  }
  
  return refined;
}
```

### Document-wide Validation Framework

**Purpose**: Apply global consistency checks and quality assurance across all extracted items

#### Uniqueness Validation

**Name Deduplication Strategy**:
```typescript
private validateUniqueness(items: MenuItem[]): MenuItem[] {
  const seen = new Map<string, MenuItem>();
  const duplicates: MenuItem[] = [];
  
  for (const item of items) {
    const normalizedName = this.normalizeName(item.name);
    
    if (seen.has(normalizedName)) {
      const existing = seen.get(normalizedName)!;
      
      // Keep higher confidence item
      if (item.confidence > existing.confidence) {
        duplicates.push(existing);
        seen.set(normalizedName, item);
      } else {
        duplicates.push(item);
      }
    } else {
      seen.set(normalizedName, item);
    }
  }
  
  this.logDuplicateRemoval(duplicates);
  return Array.from(seen.values());
}

private normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}
```

#### Price Distribution Analysis

**Economic Clustering Validation**:
```typescript
private validatePriceDistribution(items: MenuItem[]): MenuItem[] {
  const prices = items.map(item => item.price).filter(p => p > 0);
  
  if (prices.length === 0) return items;
  
  // Calculate statistical metrics
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const stdDev = this.calculateStandardDeviation(prices);
  
  // Identify outliers (prices > 3 standard deviations from mean)
  const outlierThreshold = mean + (3 * stdDev);
  
  const validatedItems = items.filter(item => {
    if (item.price === 0) return true; // Keep items without prices
    
    if (item.price > outlierThreshold) {
      this.logPriceOutlier(item, mean, stdDev);
      return false;
    }
    
    return true;
  });
  
  // Validate price clustering against restaurant categories
  const categoryAnalysis = this.analyzePricesByCategory(validatedItems);
  return this.applyCategorialPriceValidation(validatedItems, categoryAnalysis);
}
```

### Pattern Refinement Engine

**Purpose**: Enhance parsing patterns based on successful extractions for fractal propagation

#### Template Enhancement Algorithm

**Pattern Learning from Success**:
```typescript
private refinePatterns(successfulItems: MenuItem[]): PatternRefinement {
  const refinement: PatternRefinement = {
    spatialTemplates: [],
    typographyTemplates: [],
    contentPatterns: [],
    confidence: 0
  };
  
  // Extract spatial relationship templates
  for (const item of successfulItems) {
    if (item.regionImage && item.confidence > 0.8) {
      const spatialTemplate = this.extractSpatialTemplate(item);
      refinement.spatialTemplates.push(spatialTemplate);
    }
  }
  
  // Build typography consistency templates
  const typographyGroups = this.groupByTypography(successfulItems);
  for (const [key, group] of typographyGroups) {
    if (group.length >= 3) {
      const template = this.buildTypographyTemplate(group);
      refinement.typographyTemplates.push(template);
    }
  }
  
  // Extract content pattern templates
  const contentPatterns = this.extractContentPatterns(successfulItems);
  refinement.contentPatterns = contentPatterns;
  
  // Calculate overall refinement confidence
  refinement.confidence = this.calculateRefinementConfidence(refinement);
  
  return refinement;
}

private propagatePatterns(
  patterns: PatternRefinement, 
  targetRegions: MenuRegion[]
): MenuItem[] {
  const enhancedItems: MenuItem[] = [];
  
  for (const region of targetRegions) {
    // Apply spatial templates
    const spatialMatch = this.findBestSpatialMatch(region, patterns.spatialTemplates);
    
    // Apply typography templates
    const typographyMatch = this.findBestTypographyMatch(region, patterns.typographyTemplates);
    
    // Combine template guidance for enhanced extraction
    const enhancedItem = this.extractWithTemplateGuidance(
      region, 
      spatialMatch, 
      typographyMatch
    );
    
    if (enhancedItem) {
      enhancedItems.push(enhancedItem);
    }
  }
  
  return enhancedItems;
}
```

### Error Handling and Recovery

**Multi-Level Fallback Strategy**:
```typescript
interface ErrorRecovery {
  tripleExtractionFailure: (region: MenuRegion) => MenuItem | null;
  validationFailure: (item: MenuItem) => MenuItem | null;
  convergenceFailure: (items: MenuItem[]) => MenuItem[];
  completeProcessingFailure: (regions: MenuRegion[]) => MenuItem[];
}

private handleTripleExtractionFailure(region: MenuRegion): MenuItem | null {
  this.logExtractionFailure(region, 'triple_parsing');
  
  // Fallback to single-text extraction
  if (region.items.length === 1) {
    const text = region.items[0].text;
    const priceMatch = text.match(/\$(\d+\.?\d*)/);
    
    if (priceMatch) {
      const price = parseFloat(priceMatch[1]);
      const name = text.replace(/\$\d+\.?\d*/, '').trim();
      
      return this.createFallbackItem(name, '', price, region.pageNumber);
    }
  }
  
  // Fallback to text-only item
  const combinedText = region.items.map(item => item.text).join(' ');
  return this.createTextOnlyItem(combinedText, region);
}
```

## Performance Optimization

**Parallel Processing Pipeline**:
```typescript
async processRegionsInBatches(regions: MenuRegion[]): Promise<MenuItem[]> {
  const batchSize = 20;
  const results: MenuItem[] = [];
  
  for (let i = 0; i < regions.length; i += batchSize) {
    const batch = regions.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(region => this.processRegionWithTimeout(region, 5000))
    );
    
    results.push(...batchResults.filter(item => item !== null));
  }
  
  return results;
}
```

## Integration Interfaces

### Input/Output Specifications
```typescript
interface MenuItemAssemblyInput {
  validatedRegions: ProcessedRegion[];
  heuristicResults: HeuristicAnalysisResult;
  fallbackText: string;
  qualityConfig: AssemblyConfiguration;
}

interface MenuItemAssemblyOutput {
  menuItems: MenuItem[];
  processingMetrics: AssemblyMetrics;
  bootstrapResults?: BootstrapResults;
  patternRefinements: PatternRefinement[];
  qualityAssessment: QualityReport;
}
```

This comprehensive assembly and validation system ensures high-quality menu item extraction through iterative refinement, fallback processing, and fractal pattern propagation, providing robust results even for challenging PDF formats.