# Visual Box Detection Strategy for Chinese Restaurant Mode

## Overview
Chinese restaurant mode targets English-language menus with line-delineated box layouts:
- **Layout**: Name (top) → Picture (middle) → Price (bottom)
- **Container**: Rectangular boxes outlined by darker border lines
- **Background**: Box interiors match page background color
- **Shared Borders**: Adjacent boxes may share vertical border lines

## Detection Algorithm

### Phase 1: Edge Detection and Line Identification
1. **Edge Detection**: Use Sobel/Canny operators to find all edges in the image
2. **Line Extraction**: Identify horizontal and vertical lines using Hough transform
3. **Line Filtering**: Filter lines by length, straightness, and darkness relative to background

### Phase 2: Rectangle Construction
1. **Grid Formation**: Combine horizontal and vertical lines to form potential rectangles
2. **Shared Border Handling**: Detect where adjacent boxes share vertical lines
3. **Box Validation**: Verify rectangles have proper aspect ratios and dimensions

### Phase 3: Layout Validation
1. **Vertical Structure**: Validate top-middle-bottom text arrangement within boxes
2. **Text Positioning**: Confirm name text at top, price text at bottom
3. **Image Space Detection**: Identify middle region with minimal text (picture area)

### Phase 4: Content Extraction
1. **Name Extraction**: Top region text (may include Chinese characters)
2. **Price Extraction**: Bottom region numeric content with currency symbols
3. **Image Capture**: Complete box region as visual validation thumbnail

## Implementation Strategy

### Edge-Based Detection Methods
- **Sobel Edge Detection**: Identify edges in both X and Y directions
- **Hough Line Transform**: Extract straight line segments from edge data
- **Line Clustering**: Group parallel lines and identify rectangular structures
- **Border Thickness Analysis**: Measure line width consistency

### Rectangle Assembly
- **Intersection Analysis**: Find where horizontal and vertical lines intersect
- **Corner Detection**: Identify rectangular corners from line intersections
- **Shared Edge Handling**: Detect boxes that share vertical boundaries
- **Minimum Bounding Rectangle**: Create boxes from valid corner sets

### Layout Verification
- **Spatial Text Clustering**: Group text elements by Y-coordinate within detected boxes
- **Text Density Mapping**: Analyze text distribution across box regions
- **Price Pattern Validation**: Ensure bottom regions contain currency/numeric patterns

### Chinese Character Support
- **Bilingual Names**: English menu items with Chinese character names
- **Unicode Detection**: Identify Chinese character ranges (U+4E00-U+9FFF)
- **Mixed Script Handling**: Parse names containing both English and Chinese text

## Quality Metrics
- **Line Detection Confidence**: Based on edge strength and line straightness
- **Rectangle Validation Score**: Corner detection accuracy and dimensional consistency
- **Layout Validation Score**: Vertical text arrangement and spacing analysis
- **Content Extraction Accuracy**: Name/price pair validation with shared border handling