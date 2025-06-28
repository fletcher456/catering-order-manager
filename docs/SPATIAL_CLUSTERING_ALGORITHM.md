# Spatial Clustering Algorithm Documentation

## Overview

The Spatial Clustering Algorithm (Phase 1) transforms extracted text elements into coherent rectangular regions representing potential menu items. Using em-based distance thresholds and multi-phase clustering, this system identifies topologically-defined boundaries that correspond to menu item triples (name/description/price).

## Core Algorithm Architecture

### Design Philosophy

**Fractal Spatial Organization**: Professional menus exhibit hierarchical spatial organization where menu items form distinct rectangular regions with consistent internal spacing and clear boundaries between items.

**Em-Based Distance Metrics**: Distance thresholds scale with font size, ensuring consistent clustering across documents with different typography scales.

### Multi-Phase Clustering Process

#### Phase 1A: Coordinate Sorting and Preparation

**Y-Axis Sorting Strategy**:
```typescript
// Sort text items from top to bottom for systematic processing
const sortedItems = textItems.sort((a, b) => a.y - b.y);
```

**Coordinate System Validation**:
- Verify coordinate transformation from PDF to canvas space
- Ensure consistent Y-axis orientation (top-down)
- Validate spatial bounds within page dimensions

#### Phase 1B: Horizontal Band Formation

**Purpose**: Group text elements into horizontal bands based on Y-coordinate proximity

**Distance Threshold**: 1.5em tolerance for vertical grouping
- **Rationale**: Menu items typically maintain line spacing of 1-2em
- **Calculation**: `yDistance = Math.abs(item.y - lastItem.y)`
- **Grouping Rule**: `yDistance <= 1.5 * averageFontSize`

**Band Formation Algorithm**:
```typescript
private groupIntoHorizontalBands(sortedItems: TextItem[]): TextItem[][] {
  const bands: TextItem[][] = [];
  let currentBand: TextItem[] = [];
  const avgFontSize = this.calculateAverageFontSize(sortedItems);
  
  for (const item of sortedItems) {
    if (currentBand.length === 0) {
      currentBand = [item];
    } else {
      const lastItem = currentBand[currentBand.length - 1];
      const yDistance = Math.abs(item.y - lastItem.y);
      const threshold = 1.5 * avgFontSize;
      
      if (yDistance <= threshold) {
        currentBand.push(item);
      } else {
        if (currentBand.length > 0) bands.push(currentBand);
        currentBand = [item];
      }
    }
  }
  
  if (currentBand.length > 0) bands.push(currentBand);
  return bands;
}
```

#### Phase 1C: Region Clustering Within Bands

**Purpose**: Cluster text items within horizontal bands based on X-coordinate proximity

**Distance Threshold**: 6em tolerance for horizontal grouping
- **Rationale**: Menu sections maintain significant spacing between items
- **Calculation**: `xDistance = item.x - (lastItem.x + lastItem.width)`
- **Grouping Rule**: `xDistance <= 6 * averageFontSize`

**Region Formation Algorithm**:
```typescript
private clusterBandIntoRegions(band: TextItem[], pageNum: number, pageHeight: number): MenuRegion[] {
  if (band.length < 2) return [];
  
  const sortedBand = band.sort((a, b) => a.x - b.x);
  const regions: MenuRegion[] = [];
  let currentRegion: TextItem[] = [];
  const avgFontSize = this.calculateAverageFontSize(band);
  
  for (const item of sortedBand) {
    if (currentRegion.length === 0) {
      currentRegion = [item];
    } else {
      const lastItem = currentRegion[currentRegion.length - 1];
      const xDistance = item.x - (lastItem.x + lastItem.width);
      const threshold = 6 * avgFontSize;
      
      if (xDistance <= threshold) {
        currentRegion.push(item);
      } else {
        if (currentRegion.length >= 2) {
          regions.push(this.createRegionFromItems(currentRegion, pageNum, pageHeight));
        }
        currentRegion = [item];
      }
    }
  }
  
  if (currentRegion.length >= 2) {
    regions.push(this.createRegionFromItems(currentRegion, pageNum, pageHeight));
  }
  
  return regions;
}
```

## Region Construction and Validation

### Bounding Box Calculation

**Rectangular Boundary Definition**:
```typescript
interface RegionBoundingBox {
  x: number;      // Leftmost text element position
  y: number;      // Topmost text element position  
  width: number;  // Rightmost edge - leftmost edge
  height: number; // Bottommost edge - topmost edge
}

private calculateBoundingBox(items: TextItem[]): RegionBoundingBox {
  const minX = Math.min(...items.map(item => item.x));
  const maxX = Math.max(...items.map(item => item.x + item.width));
  const minY = Math.min(...items.map(item => item.y));
  const maxY = Math.max(...items.map(item => item.y + item.height));
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}
```

### Confidence Scoring Framework

**Multi-Factor Confidence Calculation**:

#### Text Length Variety Score (20% weight)
```typescript
// Names should be shorter than descriptions
const lengths = items.map(item => item.text.length);
const hasVariety = Math.max(...lengths) > Math.min(...lengths) * 1.5;
if (hasVariety) score += 0.2;
```

#### Price Pattern Detection (30% weight)
```typescript
// Strong indicator of menu item regions
const hasPricePattern = items.some(item => /\$\d+\.?\d*/.test(item.text));
if (hasPricePattern) score += 0.3;
```

#### Item Count Validation (20% weight)
```typescript
// Menu items typically contain 2-5 text elements
if (items.length >= 2 && items.length <= 5) score += 0.2;
```

#### Typography Consistency (10% weight)
```typescript
// Limited font variation within menu items
const fontNames = items.map(item => item.fontName).filter(Boolean);
const uniqueFonts = new Set(fontNames).size;
if (uniqueFonts <= 3) score += 0.1;
```

**Composite Confidence Score**:
```typescript
private calculateRegionConfidence(items: TextItem[], boundingBox: RegionBoundingBox): number {
  let score = 0.5; // Base confidence
  
  // Apply weighted scoring factors
  score += this.textLengthVarietyScore(items);      // 0.0-0.2
  score += this.pricePatternScore(items);           // 0.0-0.3
  score += this.itemCountScore(items);              // 0.0-0.2
  score += this.typographyConsistencyScore(items);  // 0.0-0.1
  
  return Math.min(score, 1.0);
}
```

## Region Filtering and Validation

### Quality Thresholds

**Minimum Confidence Threshold**: 0.6
- Regions below this threshold are discarded
- Prevents low-quality regions from contaminating results
- Balances precision vs. recall for menu item detection

**Size Constraints**:
```typescript
// Minimum viable region dimensions
const MIN_WIDTH = 3; // em units
const MIN_HEIGHT = 0.8; // em units

private validateRegionDimensions(region: MenuRegion): boolean {
  const avgFontSize = this.calculateAverageFontSize(region.items);
  return (
    region.boundingBox.width >= MIN_WIDTH * avgFontSize &&
    region.boundingBox.height >= MIN_HEIGHT * avgFontSize
  );
}
```

**Content Validation**:
```typescript
private validateRegionContent(region: MenuRegion): boolean {
  // Must have at least 2 text items
  if (region.items.length < 2) return false;
  
  // Must have substantial text content
  const totalText = region.items.map(item => item.text).join('');
  if (totalText.trim().length < 5) return false;
  
  return true;
}
```

### Advanced Validation Integration

**Heuristic Cross-Validation**:
- Typography fingerprint consistency checking
- Number classification validation for detected prices
- Pattern template matching from Phase 0 analysis

**Fractal Template Application**:
- Apply successful spatial patterns to similar regions
- Scale confidence based on template match quality
- Iterative refinement through pattern propagation

## Error Handling and Recovery

### Graceful Degradation Strategies

**Insufficient Regions**:
- Lower confidence thresholds progressively
- Reduce distance thresholds for tighter clustering
- Fallback to single-band processing for complex layouts

**Oversegmentation Detection**:
- Merge adjacent regions with compatible content
- Detect and correct split menu items
- Validate merged regions against heuristic patterns

**Typography Variations**:
- Adaptive font size calculation for mixed typography
- Robust distance threshold scaling
- Fallback to absolute pixel thresholds when em calculation fails

### Diagnostic Information

**Region Quality Metrics**:
```typescript
interface RegionDiagnostics {
  totalRegionsDetected: number;
  validRegionsAfterFiltering: number;
  averageConfidence: number;
  confidenceDistribution: number[];
  spatialCoveragePercentage: number;
  typographyConsistencyScore: number;
}
```

## Performance Optimization

### Computational Complexity

**Band Formation**: O(n) where n = number of text items
- Single pass through sorted items
- Constant time distance calculations

**Region Clustering**: O(k²) where k = items per band (typically small)
- Within-band clustering is localized
- Total complexity remains near-linear

**Confidence Scoring**: O(m) where m = items per region
- Simple aggregation operations
- Parallel processing opportunities

### Memory Efficiency

**Streaming Processing**:
- Process one page at a time to limit memory usage
- Incremental region construction
- Early garbage collection of intermediate structures

**Spatial Index Optimization**:
- Optional spatial indexing for very large documents
- Quadtree structures for efficient proximity queries
- Adaptive algorithms based on document complexity

## Integration Interfaces

### Input Requirements
```typescript
interface SpatialClusteringInput {
  pageData: PageData[];
  typographyProfiles: Map<string, TypographyFingerprint>;
  heuristicPatterns: StructuralPattern[];
  qualityThresholds: QualityConfig;
}
```

### Output Specifications
```typescript
interface SpatialClusteringResult {
  regions: MenuRegion[];
  diagnostics: RegionDiagnostics;
  processingMetrics: {
    totalTextItems: number;
    bandsFormed: number;
    regionsDetected: number;
    validRegions: number;
    processingTime: number;
  };
}
```

## Future Enhancements

### Advanced Clustering Algorithms
- DBSCAN adaptation for density-based region detection
- Hierarchical clustering for nested menu structures
- Machine learning approaches for optimal threshold learning

### Cross-Page Region Analysis
- Detection of menu items spanning page boundaries
- Consistent region merging across page breaks
- Template-based cross-page validation

### Adaptive Threshold Learning
- Document-specific threshold optimization
- Historical performance-based parameter tuning
- User feedback integration for threshold refinement