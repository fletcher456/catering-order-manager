import * as pdfjsLib from 'pdfjs-dist';
import { MenuItem } from '../types';

// Configure PDF.js worker to use local bundle
if (typeof window !== 'undefined') {
  // Use the locally served worker file
  pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';
}

interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontName?: string;
  fontWeight?: string;
  fontStyle?: string;
}

interface TypographyFingerprint {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  avgLength: number;
  commonPatterns: string[];
  confidence: number;
}

interface NumberClassification {
  value: number;
  type: 'price' | 'count' | 'calorie' | 'measurement' | 'item_number' | 'unknown';
  confidence: number;
  reasoning: string;
}

interface StructuralPattern {
  nameFingerprint: TypographyFingerprint;
  descriptionFingerprint: TypographyFingerprint;
  priceFingerprint: TypographyFingerprint;
  spatialRelationships: {
    nameToDescription: { dx: number; dy: number; tolerance: number };
    descriptionToPrice: { dx: number; dy: number; tolerance: number };
    nameToPrice: { dx: number; dy: number; tolerance: number };
  };
  confidence: number;
}

interface MenuRegion {
  items: TextItem[];
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  pageNumber: number;
  pageHeight: number;
}

export class MenuPDFParser {
  private logCallback?: (message: string) => void;
  private documentPatterns: StructuralPattern[] = [];
  private numberClassifications: NumberClassification[] = [];
  private typographyProfiles: Map<string, TypographyFingerprint> = new Map();

  setLogCallback(callback: (message: string) => void) {
    this.logCallback = callback;
  }

  private log(message: string) {
    console.log(`[PDF Parser] ${message}`);
    if (this.logCallback) {
      this.logCallback(`[PDF Parser] ${message}`);
    }
  }

  async extractMenuFromPDF(file: File): Promise<MenuItem[]> {
    try {
      this.log(`Starting PDF parsing for file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      this.log('Converting file to array buffer...');
      const arrayBuffer = await file.arrayBuffer();
      this.log(`Array buffer created: ${arrayBuffer.byteLength} bytes`);
      
      this.log('Loading PDF document...');
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false
      }).promise;
      this.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
      
      let allText = '';
      let textItems: TextItem[] = [];
      const pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[] = [];
      
      // Extract text from all pages with enhanced typography data
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        this.log(`Processing page ${pageNum}/${pdf.numPages}...`);
        
        const page = await pdf.getPage(pageNum);
        this.log(`Page ${pageNum} loaded, extracting text content...`);
        
        const textContent = await page.getTextContent();
        this.log(`Page ${pageNum}: Found ${textContent.items.length} text items`);
        
        // Get page dimensions for region extraction
        const viewport = page.getViewport({ scale: 1.0 });
        const pageHeight = viewport.height;
        
        // Preserve spatial information for better parsing with enhanced typography data
        const pageItems: TextItem[] = textContent.items.map((item: any) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height,
          fontSize: item.height,
          fontName: item.fontName || 'unknown',
          fontWeight: this.extractFontWeight(item.fontName || ''),
          fontStyle: this.extractFontStyle(item.fontName || '')
        }));
        
        // Store page data for region extraction
        pageData.push({
          textItems: pageItems,
          pageNum,
          pageHeight
        });
        
        textItems.push(...pageItems);
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        allText += pageText + '\n';
        
        this.log(`Page ${pageNum}: Extracted ${pageText.length} characters`);
      }
      
      this.log(`Text extraction complete. Total characters: ${allText.length}`);
      this.log(`Total text items collected: ${textItems.length}`);
      
      // Phase 0: Heuristic Analysis - Number classification and typography fingerprinting
      this.log('Phase 0: Performing heuristic analysis...');
      this.performHeuristicAnalysis(pageData);
      
      this.log('Starting topological region analysis...');
      const regions = this.detectMenuRegions(pageData);
      this.log(`Found ${regions.length} potential menu regions`);
      
      this.log('Extracting menu items with heuristic validation...');
      const menuItems = await this.extractMenuItemsWithHeuristics(regions, allText, pdf);
      this.log(`Menu parsing complete. Found ${menuItems.length} items`);
      
      return menuItems;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(`ERROR: ${errorMessage}`);
      console.error('Error parsing PDF:', error);
      throw new Error(`Failed to parse PDF: ${errorMessage}`);
    }
  }

  /**
   * Extracts font weight from font name using heuristic patterns
   */
  private extractFontWeight(fontName: string): string {
    const name = fontName.toLowerCase();
    if (name.includes('bold') || name.includes('heavy') || name.includes('black')) return 'bold';
    if (name.includes('light') || name.includes('thin')) return 'light';
    if (name.includes('medium')) return 'medium';
    return 'normal';
  }

  /**
   * Extracts font style from font name using heuristic patterns
   */
  private extractFontStyle(fontName: string): string {
    const name = fontName.toLowerCase();
    if (name.includes('italic') || name.includes('oblique')) return 'italic';
    return 'normal';
  }

  /**
   * Phase 0: Heuristic Analysis - Number classification and typography fingerprinting
   */
  private performHeuristicAnalysis(pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[]): void {
    this.log('Performing number classification analysis...');
    
    // Collect all numbers from the document
    const allNumbers: { value: number; text: string; item: TextItem }[] = [];
    
    for (const page of pageData) {
      for (const item of page.textItems) {
        const numbers = this.extractNumbers(item.text);
        numbers.forEach(num => {
          allNumbers.push({ value: num, text: item.text, item });
        });
      }
    }
    
    this.log(`Found ${allNumbers.length} numeric values for classification`);
    
    // Classify each number using heuristic rules
    this.numberClassifications = allNumbers.map(num => this.classifyNumber(num.value, num.text, num.item));
    
    // Build typography fingerprints
    this.log('Building typography fingerprints...');
    this.buildTypographyFingerprints(pageData);
    
    // Extract structural patterns from high-confidence regions
    this.log('Extracting structural patterns...');
    this.extractStructuralPatterns(pageData);
  }

  /**
   * Extract numbers from text using regex patterns
   */
  private extractNumbers(text: string): number[] {
    const numberMatches = text.match(/\d+\.?\d*/g);
    if (!numberMatches) return [];
    
    return numberMatches.map(match => parseFloat(match)).filter(num => !isNaN(num));
  }

  /**
   * Classify a number using heuristic rules from the engineering strategy
   */
  private classifyNumber(value: number, text: string, item: TextItem): NumberClassification {
    // Price indicators
    if (text.match(/^\$?\d+\.?\d{0,2}$/) && value > 0.5 && value < 200) {
      return {
        value,
        type: 'price',
        confidence: 0.9,
        reasoning: 'Currency format with reasonable restaurant pricing range'
      };
    }
    
    // Calorie indicators
    if (value >= 100 && value <= 2000 && (text.includes('cal') || text.includes('kcal'))) {
      return {
        value,
        type: 'calorie',
        confidence: 0.85,
        reasoning: 'Large number with calorie suffix in typical range'
      };
    }
    
    // Measurement indicators
    if (text.match(/\d+\s*(oz|lb|"|'|inch|foot|liter|ml)/i)) {
      return {
        value,
        type: 'measurement',
        confidence: 0.8,
        reasoning: 'Number followed by measurement unit'
      };
    }
    
    // Piece count indicators
    if (value <= 20 && Number.isInteger(value) && !text.includes('$')) {
      return {
        value,
        type: 'count',
        confidence: 0.6,
        reasoning: 'Small integer without currency symbols'
      };
    }
    
    // Item number indicators
    if (text.match(/^#?\d+$/) || text.match(/No\.\s*\d+/i)) {
      return {
        value,
        type: 'item_number',
        confidence: 0.7,
        reasoning: 'Sequential number with prefix patterns'
      };
    }
    
    return {
      value,
      type: 'unknown',
      confidence: 0.3,
      reasoning: 'Does not match known heuristic patterns'
    };
  }

  /**
   * Build typography fingerprints for different element types
   */
  private buildTypographyFingerprints(pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[]): void {
    const typeGroups = new Map<string, TextItem[]>();
    
    // Group text items by typography characteristics
    for (const page of pageData) {
      for (const item of page.textItems) {
        const key = `${item.fontName}-${item.fontSize}-${item.fontWeight}`;
        if (!typeGroups.has(key)) {
          typeGroups.set(key, []);
        }
        typeGroups.get(key)!.push(item);
      }
    }
    
    // Create fingerprints for each typography group
    for (const [key, items] of typeGroups) {
      if (items.length < 3) continue; // Skip groups with too few samples
      
      const avgLength = items.reduce((sum, item) => sum + item.text.length, 0) / items.length;
      const commonPatterns = this.extractCommonPatterns(items.map(item => item.text));
      
      const fingerprint: TypographyFingerprint = {
        fontFamily: items[0].fontName || 'unknown',
        fontSize: items[0].fontSize || 12,
        fontWeight: items[0].fontWeight || 'normal',
        avgLength,
        commonPatterns,
        confidence: Math.min(items.length / 10, 1.0) // Higher confidence with more samples
      };
      
      this.typographyProfiles.set(key, fingerprint);
    }
    
    this.log(`Built ${this.typographyProfiles.size} typography fingerprints`);
  }

  /**
   * Extract common patterns from text samples
   */
  private extractCommonPatterns(texts: string[]): string[] {
    const patterns: string[] = [];
    
    // Check for common menu item patterns
    const menuPatterns = [
      /\b(served|with|topped|fresh|grilled|fried|baked)\b/i,
      /\$\d+\.\d{2}/,
      /\b\d+\s*(oz|lb)\b/i,
      /\b(appetizer|entree|dessert|beverage)\b/i
    ];
    
    menuPatterns.forEach(pattern => {
      const matches = texts.filter(text => pattern.test(text));
      if (matches.length > texts.length * 0.3) { // 30% threshold
        patterns.push(pattern.source);
      }
    });
    
    return patterns;
  }

  /**
   * Extract structural patterns from document analysis
   */
  private extractStructuralPatterns(pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[]): void {
    // This is a simplified implementation - would expand based on successful triple identification
    // For now, we'll focus on the enhanced region-based extraction
    this.log('Structural pattern extraction deferred to region analysis phase');
  }

  /**
   * Enhanced menu item extraction with heuristic validation
   */
  private async extractMenuItemsWithHeuristics(regions: MenuRegion[], fallbackText: string, pdf: any): Promise<MenuItem[]> {
    const menuItems: MenuItem[] = [];
    
    for (const region of regions) {
      try {
        const item = await this.parseMenuItemFromRegionWithHeuristics(region, pdf);
        if (item) {
          menuItems.push(item);
        }
      } catch (error) {
        this.log(`Error processing region: ${error}`);
        // Try fallback parsing without heuristics
        const fallbackItem = await this.parseMenuItemFromRegionWithImage(region, pdf);
        if (fallbackItem) {
          menuItems.push(fallbackItem);
        }
      }
    }
    
    // Apply document-wide validation
    const validatedItems = this.validateMenuItemsWithHeuristics(menuItems);
    
    // Fallback to traditional parsing if heuristic parsing yields too few results
    if (validatedItems.length < 3) {
      this.log('Heuristic parsing yielded few results, applying fallback parsing...');
      const fallbackItems = this.extractMenuItemsFromRegions(regions, fallbackText);
      return this.deduplicateItems([...validatedItems, ...fallbackItems]);
    }
    
    return validatedItems;
  }

  /**
   * Parse menu item from region using heuristic validation
   */
  private async parseMenuItemFromRegionWithHeuristics(region: MenuRegion, pdf: any): Promise<MenuItem | null> {
    // Start with basic region parsing
    const baseItem = await this.parseMenuItemFromRegionWithImage(region, pdf);
    if (!baseItem) return null;
    
    // Apply heuristic validation
    const validationResult = this.validateMenuItemWithHeuristics(baseItem, region);
    
    if (validationResult.isValid) {
      return {
        ...baseItem,
        confidence: validationResult.confidence
      };
    }
    
    return null;
  }

  /**
   * Validate menu item using heuristic rules
   */
  private validateMenuItemWithHeuristics(item: MenuItem, region: MenuRegion): { isValid: boolean; confidence: number } {
    let confidence = 0.5; // Base confidence
    let validationScore = 0;
    const checks = [];
    
    // Name length validation
    if (item.name.length <= 50 && item.name.length >= 2) {
      validationScore += 0.2;
      checks.push('Name length appropriate');
    }
    
    // Description length validation
    if (!item.description || item.description.length >= item.name.length) {
      validationScore += 0.2;
      checks.push('Description length valid');
    }
    
    // Price validation using number classification
    const priceClassification = this.numberClassifications.find(
      nc => nc.value === item.price && nc.type === 'price'
    );
    if (priceClassification && priceClassification.confidence > 0.7) {
      validationScore += 0.3;
      checks.push('Price classification confident');
    }
    
    // Typography consistency validation
    const regionTexts = region.items.map(i => i.text);
    const hasTypographyConsistency = this.checkTypographyConsistency(regionTexts);
    if (hasTypographyConsistency) {
      validationScore += 0.2;
      checks.push('Typography consistent');
    }
    
    // Economic reasonableness
    if (item.price > 0.5 && item.price < 200) {
      validationScore += 0.1;
      checks.push('Price economically reasonable');
    }
    
    confidence = Math.min(validationScore, 1.0);
    
    return {
      isValid: confidence > 0.6,
      confidence
    };
  }

  /**
   * Check typography consistency within a region
   */
  private checkTypographyConsistency(texts: string[]): boolean {
    // Simplified check - would expand with more sophisticated analysis
    return texts.length >= 2 && texts.length <= 6; // Reasonable text count for menu item
  }

  /**
   * Validate entire menu items list using document-wide heuristics
   */
  private validateMenuItemsWithHeuristics(items: MenuItem[]): MenuItem[] {
    // Name uniqueness validation
    const uniqueNames = new Set();
    const validatedItems = items.filter(item => {
      const nameKey = item.name.toLowerCase().trim();
      if (uniqueNames.has(nameKey)) {
        return false; // Duplicate name
      }
      uniqueNames.add(nameKey);
      return true;
    });
    
    this.log(`Uniqueness validation: ${items.length} → ${validatedItems.length} items`);
    
    // Price distribution validation
    const prices = validatedItems.map(item => item.price).filter(p => p > 0);
    if (prices.length > 0) {
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const filteredItems = validatedItems.filter(item => {
        if (item.price === 0) return true; // Keep items without prices
        return item.price < avgPrice * 3; // Remove outliers
      });
      
      this.log(`Price validation: ${validatedItems.length} → ${filteredItems.length} items`);
      return filteredItems;
    }
    
    return validatedItems;
  }

  /**
   * Phase 1: Spatial Clustering Algorithm
   * Groups text elements into coherent rectangular regions based on proximity
   */
  private detectMenuRegions(pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[]): MenuRegion[] {
    this.log('Applying spatial clustering algorithm...');
    const allRegions: MenuRegion[] = [];
    
    for (const page of pageData) {
      this.log(`Processing page ${page.pageNum} with ${page.textItems.length} text items`);
      
      // Filter out empty or whitespace-only items
      const validItems = page.textItems.filter(item => item.text.trim().length > 0);
      
      // Sort by Y coordinate (top to bottom)
      const sortedItems = validItems.sort((a, b) => a.y - b.y);
      
      // Group into horizontal bands
      const horizontalBands = this.groupIntoHorizontalBands(sortedItems);
      this.log(`Found ${horizontalBands.length} horizontal bands on page ${page.pageNum}`);
      
      // Cluster each band into regions
      for (const band of horizontalBands) {
        const regions = this.clusterBandIntoRegions(band, page.pageNum, page.pageHeight);
        allRegions.push(...regions);
      }
    }
    
    this.log(`Total regions detected: ${allRegions.length}`);
    
    // Filter and validate regions
    const validRegions = this.filterAndValidateRegions(allRegions);
    this.log(`Valid regions after filtering: ${validRegions.length}`);
    
    return validRegions;
  }

  /**
   * Groups text items into horizontal bands based on Y-coordinate proximity
   */
  private groupIntoHorizontalBands(sortedItems: TextItem[]): TextItem[][] {
    const bands: TextItem[][] = [];
    let currentBand: TextItem[] = [];
    
    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      
      if (currentBand.length === 0) {
        currentBand = [item];
      } else {
        const lastItem = currentBand[currentBand.length - 1];
        const yDistance = Math.abs(item.y - lastItem.y);
        
        // If items are close vertically (within 20px), group them
        if (yDistance <= 20) {
          currentBand.push(item);
        } else {
          // Start new band
          if (currentBand.length > 0) {
            bands.push(currentBand);
          }
          currentBand = [item];
        }
      }
    }
    
    // Add the last band
    if (currentBand.length > 0) {
      bands.push(currentBand);
    }
    
    return bands;
  }

  /**
   * Clusters text items within a horizontal band into regions based on X-coordinate proximity
   */
  private clusterBandIntoRegions(band: TextItem[], pageNum: number, pageHeight: number): MenuRegion[] {
    if (band.length < 2) return [];
    
    // Sort band by X coordinate (left to right)
    const sortedBand = band.sort((a, b) => a.x - b.x);
    
    const regions: MenuRegion[] = [];
    let currentRegion: TextItem[] = [];
    
    for (let i = 0; i < sortedBand.length; i++) {
      const item = sortedBand[i];
      
      if (currentRegion.length === 0) {
        currentRegion = [item];
      } else {
        const lastItem = currentRegion[currentRegion.length - 1];
        const xDistance = item.x - (lastItem.x + lastItem.width);
        
        // If items are close horizontally (within 100px), group them
        if (xDistance <= 100) {
          currentRegion.push(item);
        } else {
          // Create region from current group
          if (currentRegion.length >= 2) {
            const region = this.createRegionFromItems(currentRegion, pageNum, pageHeight);
            regions.push(region);
          }
          currentRegion = [item];
        }
      }
    }
    
    // Add the last region
    if (currentRegion.length >= 2) {
      const region = this.createRegionFromItems(currentRegion, pageNum, pageHeight);
      regions.push(region);
    }
    
    return regions;
  }

  /**
   * Creates a MenuRegion from a collection of text items
   */
  private createRegionFromItems(items: TextItem[], pageNum: number, pageHeight: number): MenuRegion {
    // Calculate bounding box
    const minX = Math.min(...items.map(item => item.x));
    const maxX = Math.max(...items.map(item => item.x + item.width));
    const minY = Math.min(...items.map(item => item.y));
    const maxY = Math.max(...items.map(item => item.y + item.height));
    
    const boundingBox = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
    
    // Calculate confidence score
    const confidence = this.calculateRegionConfidence(items, boundingBox);
    
    return {
      items,
      boundingBox,
      confidence,
      pageNumber: pageNum,
      pageHeight
    };
  }

  /**
   * Calculates confidence score for a region based on menu item characteristics
   */
  private calculateRegionConfidence(items: TextItem[], boundingBox: any): number {
    let score = 0.5; // Base score
    
    // Text length variety (names shorter, descriptions longer)
    const lengths = items.map(item => item.text.length);
    const hasVariety = Math.max(...lengths) > Math.min(...lengths) * 1.5;
    if (hasVariety) score += 0.2;
    
    // Price pattern detection
    const hasPricePattern = items.some(item => /\$\d+\.?\d*/.test(item.text));
    if (hasPricePattern) score += 0.3;
    
    // Reasonable item count (2-5 elements typical for menu item)
    if (items.length >= 2 && items.length <= 5) score += 0.2;
    
    // Typography consistency using heuristics
    const fontNames = items.map(item => item.fontName).filter(Boolean);
    const uniqueFonts = new Set(fontNames).size;
    if (uniqueFonts <= 3) score += 0.1; // Not too many different fonts
    
    return Math.min(score, 1.0);
  }

  /**
   * Filters regions based on confidence and characteristics
   */
  private filterAndValidateRegions(regions: MenuRegion[]): MenuRegion[] {
    return regions.filter(region => {
      // Minimum confidence threshold
      if (region.confidence < 0.6) return false;
      
      // Reasonable size constraints
      if (region.boundingBox.width < 50 || region.boundingBox.height < 10) return false;
      
      // Must have at least 2 text items
      if (region.items.length < 2) return false;
      
      // Should have some text content
      const totalText = region.items.map(item => item.text).join('');
      if (totalText.trim().length < 5) return false;
      
      return true;
    });
  }

  /**
   * Parse menu item from region with image extraction
   */
  private async parseMenuItemFromRegionWithImage(region: MenuRegion, pdf: any): Promise<MenuItem | null> {
    try {
      // Extract text elements from region
      const texts = region.items.map(item => item.text.trim()).filter(text => text.length > 0);
      
      if (texts.length < 2) return null;
      
      // Attempt to identify name, description, and price using heuristics
      let name = '';
      let description = '';
      let price = 0;
      
      // Find price first (most reliable pattern)
      const priceRegex = /\$(\d+\.?\d*)/;
      for (const text of texts) {
        const priceMatch = text.match(priceRegex);
        if (priceMatch) {
          price = parseFloat(priceMatch[1]);
          break;
        }
      }
      
      // Remove price text from consideration for name/description
      const nonPriceTexts = texts.filter(text => !priceRegex.test(text));
      
      if (nonPriceTexts.length >= 1) {
        // First non-price text is likely the name
        name = nonPriceTexts[0];
        
        // Remaining texts form description
        if (nonPriceTexts.length > 1) {
          description = nonPriceTexts.slice(1).join(' ');
        }
      } else {
        // Fallback: use first text as name
        name = texts[0];
      }
      
      // Extract region image
      const regionImage = await this.extractRegionImage(region, pdf);
      
      return {
        id: `item-${region.pageNumber}-${Math.floor(region.boundingBox.x)}-${Math.floor(region.boundingBox.y)}`,
        name: this.cleanItemName(name),
        price,
        description: description || undefined,
        category: this.categorizeItem(name, description),
        servingSize: this.estimateServingSize(name, description),
        regionImage,
        confidence: region.confidence
      };
    } catch (error) {
      this.log(`Error parsing region: ${error}`);
      return null;
    }
  }

  /**
   * Extracts a rectangular region from PDF as base64 image
   */
  private async extractRegionImage(region: MenuRegion, pdf: any): Promise<string | undefined> {
    try {
      const page = await pdf.getPage(region.pageNumber);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better quality
      
      // Create canvas for rendering
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render the page
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convert region coordinates to canvas coordinates
      const scale = 2.0;
      const padding = 5; // Add small padding around region
      
      const x = Math.max(0, (region.boundingBox.x - padding) * scale);
      const y = Math.max(0, (viewport.height - region.boundingBox.y - region.boundingBox.height - padding) * scale);
      const width = Math.min(canvas.width - x, (region.boundingBox.width + 2 * padding) * scale);
      const height = Math.min(canvas.height - y, (region.boundingBox.height + 2 * padding) * scale);
      
      // Extract region as image data
      const imageData = context.getImageData(x, y, width, height);
      
      // Create a new canvas for the cropped region
      const regionCanvas = document.createElement('canvas');
      const regionContext = regionCanvas.getContext('2d')!;
      regionCanvas.width = width;
      regionCanvas.height = height;
      
      regionContext.putImageData(imageData, 0, 0);
      
      // Convert to base64
      return regionCanvas.toDataURL('image/png');
    } catch (error) {
      this.log(`Error extracting region image: ${error}`);
      return undefined;
    }
  }

  /**
   * Fallback parsing for regions without enhanced heuristics
   */
  private extractMenuItemsFromRegions(regions: MenuRegion[], fallbackText: string): MenuItem[] {
    const items: MenuItem[] = [];
    
    for (const region of regions) {
      const item = this.parseMenuItemFromRegion(region);
      if (item) {
        items.push(item);
      }
    }
    
    // If we still have few items, try basic text parsing
    if (items.length < 3) {
      const textItems = this.parseMenuItems(fallbackText, []);
      items.push(...textItems);
    }
    
    return this.deduplicateItems(items);
  }

  /**
   * Parse menu item from region (fallback without image)
   */
  private parseMenuItemFromRegion(region: MenuRegion): MenuItem | null {
    const texts = region.items.map(item => item.text.trim()).filter(text => text.length > 0);
    
    if (texts.length < 2) return null;
    
    let name = '';
    let description = '';
    let price = 0;
    
    // Find price
    const priceRegex = /\$(\d+\.?\d*)/;
    for (const text of texts) {
      const priceMatch = text.match(priceRegex);
      if (priceMatch) {
        price = parseFloat(priceMatch[1]);
        break;
      }
    }
    
    // Remove price text
    const nonPriceTexts = texts.filter(text => !priceRegex.test(text));
    
    if (nonPriceTexts.length >= 1) {
      name = nonPriceTexts[0];
      if (nonPriceTexts.length > 1) {
        description = nonPriceTexts.slice(1).join(' ');
      }
    } else {
      name = texts[0];
    }
    
    return {
      id: `item-${region.pageNumber}-${Math.floor(region.boundingBox.x)}-${Math.floor(region.boundingBox.y)}`,
      name: this.cleanItemName(name),
      price,
      description: description || undefined,
      category: this.categorizeItem(name, description),
      servingSize: this.estimateServingSize(name, description),
      confidence: region.confidence
    };
  }

  private parseMenuItems(text: string, _textItems: TextItem[]): MenuItem[] {
    const items: MenuItem[] = [];
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for price patterns
      const priceMatch = line.match(/\$(\d+\.?\d*)/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1]);
        const nameText = line.replace(/\$\d+\.?\d*/, '').trim();
        
        if (nameText.length > 0) {
          const item: MenuItem = {
            id: `fallback-${i}`,
            name: this.cleanItemName(nameText),
            price,
            category: this.categorizeItem(nameText, ''),
            servingSize: this.estimateServingSize(nameText, ''),
            confidence: 0.5
          };
          
          items.push(item);
        }
      }
    }
    
    return items;
  }

  private categorizeItem(name: string, description: string): string {
    const text = (name + ' ' + description).toLowerCase();
    
    if (text.match(/appetizer|starter|app\b|dip|wing|nachos|salad/)) return 'Appetizers';
    if (text.match(/burger|sandwich|wrap|pizza|pasta|steak|chicken|fish|entree|main/)) return 'Main Courses';
    if (text.match(/dessert|cake|pie|ice cream|sundae|cookie/)) return 'Desserts';
    if (text.match(/drink|beverage|soda|beer|wine|cocktail|coffee|tea/)) return 'Beverages';
    if (text.match(/side|fries|rice|vegetables|potato/)) return 'Sides';
    
    return 'Other';
  }

  private estimateServingSize(name: string, description: string): number {
    const text = (name + ' ' + description).toLowerCase();
    
    if (text.match(/appetizer|starter|side/)) return 2;
    if (text.match(/salad|soup/)) return 1;
    if (text.match(/pizza|large|family/)) return 4;
    if (text.match(/sharing|platter/)) return 6;
    
    return 1; // Default individual serving
  }

  private cleanItemName(name: string): string {
    return name
      .replace(/\$\d+\.?\d*/, '') // Remove prices
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .replace(/^[•\-\*]+\s*/, '') // Remove bullet points
      .replace(/\s*[•\-\*]+$/, ''); // Remove trailing markers
  }

  private deduplicateItems(items: MenuItem[]): MenuItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
      const key = item.name.toLowerCase().trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}