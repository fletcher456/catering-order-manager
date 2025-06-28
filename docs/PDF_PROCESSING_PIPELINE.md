# PDF Processing Pipeline Documentation

## Overview

The PDF Processing Pipeline handles the foundational extraction of text content and typography metadata from restaurant menu PDFs. This layer transforms binary PDF data into structured text elements with spatial coordinates and font information, providing the foundation for all subsequent analysis phases.

## Architecture Components

### PDF Loader Module

**Purpose**: Initialize PDF.js and convert uploaded files into processable documents

**Design Decisions**:
- Local PDF.js worker to eliminate CDN dependencies for GitHub Pages deployment
- ArrayBuffer processing for memory efficiency
- Explicit worker configuration to prevent CORS issues

**Implementation Requirements**:
```typescript
interface PDFLoadConfig {
  data: ArrayBuffer;
  useWorkerFetch: false;        // Force local processing
  isEvalSupported: false;       // Security constraint
  workerSrc: './pdf.worker.min.js';  // Local worker path
}
```

**Error Handling**:
- Invalid PDF format detection
- Corrupted file recovery
- Memory overflow protection
- Worker initialization failures

### Text Extraction Engine

**Core Functionality**: Extract text content with preserved spatial relationships and typography metadata

#### Page Iterator
**Purpose**: Sequential processing of multi-page documents with consistent scaling

**Technical Specifications**:
- Viewport scaling factor: 1.0 for coordinate consistency
- Page height preservation for coordinate transformation
- Sequential processing to maintain memory efficiency

**Implementation Pattern**:
```typescript
for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.0 });
  // Process page content
}
```

#### Text Content Extraction
**Purpose**: Convert PDF text objects into structured TextItem interfaces

**Coordinate System Design Decision**:
- **Input**: PDF coordinate system (bottom-up, origin at bottom-left)
- **Output**: Canvas coordinate system (top-down, origin at top-left)
- **Transformation**: `y_canvas = viewport.height - y_pdf`

**TextItem Interface Requirements**:
```typescript
interface TextItem {
  text: string;           // Raw text content
  x: number;             // Left edge coordinate (transformed)
  y: number;             // Top edge coordinate (transformed)
  width: number;         // Text width in points
  height: number;        // Text height in points
  fontSize: number;      // Approximate font size from height
  fontName: string;      // PDF font identifier
  fontWeight: string;    // Extracted weight (normal|bold|light)
  fontStyle: string;     // Extracted style (normal|italic)
}
```

### Typography Enhancement System

**Purpose**: Extract semantic typography information from PDF font metadata

#### Font Weight Extraction
**Heuristic Patterns**:
- Bold indicators: `bold`, `heavy`, `black` in font name
- Light indicators: `light`, `thin` in font name
- Medium indicators: `medium` in font name
- Default: `normal` for unmatched patterns

**Implementation Strategy**:
```typescript
private extractFontWeight(fontName: string): string {
  const name = fontName.toLowerCase();
  if (name.includes('bold') || name.includes('heavy') || name.includes('black')) 
    return 'bold';
  if (name.includes('light') || name.includes('thin')) 
    return 'light';
  if (name.includes('medium')) 
    return 'medium';
  return 'normal';
}
```

#### Font Style Extraction
**Pattern Recognition**:
- Italic indicators: `italic`, `oblique` in font name
- Default: `normal` for standard fonts

**Design Rationale**: PDF font names often encode style information in standardized patterns. This extraction enables typography fingerprinting for menu structure analysis.

## Data Flow Architecture

### Sequential Processing Pipeline
1. **File Validation** → **PDF Loading** → **Page Iteration**
2. **Text Extraction** → **Typography Enhancement** → **Data Aggregation**
3. **Coordinate Transformation** → **Spatial Preparation** → **Handoff to Analysis**

### Memory Management Strategy

**Page-by-Page Processing**: Prevent memory overflow for large documents
- Process one page at a time
- Aggregate results incrementally
- Release page resources after processing

**Text Aggregation Pattern**:
```typescript
const pageData: PageData[] = [];
let allText = '';

for (page processing) {
  // Extract and enhance text items
  pageData.push({ textItems, pageNum, pageHeight });
  allText += pageText + '\n';
}
```

## Error Recovery Mechanisms

### Graceful Degradation Strategy

**Font Metadata Failures**:
- Fallback to 'unknown' for missing font names
- Default typography values for extraction failures
- Continue processing with reduced metadata quality

**Page Processing Errors**:
- Skip corrupted pages with logging
- Continue with remaining pages
- Report partial success to user

**Memory Constraints**:
- Reduce viewport scaling for large documents
- Implement page batching for extremely large PDFs
- Provide progress feedback for long operations

### Logging Integration

**Progress Tracking**:
- File size and page count reporting
- Per-page processing confirmation
- Character count and text item statistics
- Error event documentation

**Debug Information**:
- Font metadata extraction results
- Coordinate transformation validation
- Memory usage monitoring
- Processing time measurements

## Performance Optimization

### Browser Compatibility

**PDF.js Configuration**:
- Worker isolation for main thread performance
- Local worker bundle for reliable loading
- Optimized viewport scaling for rendering efficiency

**Memory Efficiency**:
- Streaming text extraction
- Incremental result aggregation
- Garbage collection friendly patterns

### Scalability Considerations

**Large Document Handling**:
- Progress indication for user feedback
- Configurable timeout limits
- Memory monitoring and fallback strategies

**Typography Processing**:
- Efficient string operations for font analysis
- Cached pattern matching for repeated fonts
- Minimal object creation during extraction

## Integration Interfaces

### Input Requirements
- Valid PDF file as File or ArrayBuffer
- Optional callback for progress updates
- Configuration for scaling and processing limits

### Output Specifications
```typescript
interface ExtractionResult {
  pageData: PageData[];     // Structured page content
  allText: string;          // Fallback text content
  textItems: TextItem[];    // Aggregated text elements
  processingMetrics: {
    pageCount: number;
    textItemCount: number;
    characterCount: number;
    processingTime: number;
  };
}
```

### Handoff to Analysis Phases
- Clean data structures for spatial clustering
- Typography metadata for fingerprinting
- Fallback text for traditional parsing
- Error state information for recovery

## Quality Assurance

### Validation Checkpoints
- Text extraction completeness verification
- Coordinate system transformation accuracy
- Typography metadata consistency
- Memory usage within acceptable limits

### Testing Strategy
- Multi-page document validation
- Font variety handling verification
- Error condition robustness testing
- Performance benchmarking across document sizes

## Future Enhancement Opportunities

### Advanced Typography Analysis
- Font similarity clustering
- Style consistency validation
- Advanced weight/style detection algorithms

### Performance Improvements
- Web Worker utilization for parallel processing
- Streaming PDF processing for very large documents
- Caching strategies for repeated document analysis

### Extended Metadata Extraction
- Color information for design analysis
- Advanced positioning metadata
- Text decoration and formatting preservation