# Visual Box Detection Strategy for Chinese Restaurant Mode

## Overview
Chinese restaurant mode now targets English-language menus with structured visual layouts:
- **Layout**: Name (top) → Picture (middle) → Price (bottom)
- **Container**: Darker rectangular boxes against light page background
- **Content**: English text with potential Chinese characters in names

## Detection Algorithm

### Phase 1: Background Analysis
1. **Page Color Profiling**: Analyze overall page background color/brightness
2. **Contrast Detection**: Identify regions significantly darker than background
3. **Box Boundary Detection**: Find rectangular regions with consistent darker borders

### Phase 2: Layout Validation
1. **Vertical Structure**: Validate top-middle-bottom arrangement within boxes
2. **Text Positioning**: Confirm name text at top, price text at bottom
3. **Image Space Detection**: Identify middle region with minimal text (picture area)

### Phase 3: Content Extraction
1. **Name Extraction**: Top region text (may include Chinese characters)
2. **Price Extraction**: Bottom region numeric content with currency symbols
3. **Image Capture**: Middle region as visual validation thumbnail

## Implementation Strategy

### Box Detection Methods
- **Color Histogram Analysis**: Detect darker regions vs light background
- **Edge Detection**: Find rectangular boundaries with consistent thickness
- **Contrast Thresholding**: Identify regions with >20% darker pixel intensity

### Layout Verification
- **Spatial Clustering**: Group text elements by Y-coordinate within boxes
- **Text Density Analysis**: Confirm sparse middle region (image area)
- **Price Pattern Validation**: Bottom text must contain currency/numeric patterns

### Chinese Character Support
- **Bilingual Names**: English menu items with Chinese character names
- **Unicode Detection**: Identify Chinese character ranges (U+4E00-U+9FFF)
- **Mixed Script Handling**: Parse names containing both English and Chinese text

## Quality Metrics
- **Box Detection Confidence**: Based on contrast ratio and rectangular consistency
- **Layout Validation Score**: Vertical arrangement and text distribution
- **Content Extraction Accuracy**: Name/price pair validation with image confirmation