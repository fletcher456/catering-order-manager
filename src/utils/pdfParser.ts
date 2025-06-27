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
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        this.log(`Processing page ${pageNum}/${pdf.numPages}...`);
        
        const page = await pdf.getPage(pageNum);
        this.log(`Page ${pageNum} loaded, extracting text content...`);
        
        const textContent = await page.getTextContent();
        this.log(`Page ${pageNum}: Found ${textContent.items.length} text items`);
        
        // Get page dimensions for region extraction
        const viewport = page.getViewport({ scale: 1.0 });
        const pageHeight = viewport.height;
        
        // Preserve spatial information for better parsing
        const pageItems = textContent.items.map((item: any) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height,
          fontSize: item.height, // Approximate font size from height
          fontName: item.fontName || 'unknown'
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
      
      this.log('Starting topological region analysis...');
      const regions = this.detectMenuRegions(pageData);
      this.log(`Found ${regions.length} potential menu regions`);
      
      this.log('Extracting menu items with PDF region images...');
      const menuItems = await this.extractMenuItemsWithRegions(regions, allText, pdf);
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
   * Phase 1: Spatial Clustering Algorithm
   * Groups text elements into coherent rectangular regions based on proximity
   */
  private detectMenuRegions(pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[]): MenuRegion[] {
    this.log('Applying spatial clustering algorithm...');
    const allRegions: MenuRegion[] = [];
    
    for (const page of pageData) {
      // Filter out very small text items (likely noise)
      const validItems = page.textItems.filter(item => 
        item.text.trim().length > 0 && 
        item.width > 0 && 
        item.height > 0
      );
      
      this.log(`Page ${page.pageNum}: Filtered ${validItems.length} valid text items from ${page.textItems.length} total`);
      
      // Phase 1: Sort by Y coordinate and group into horizontal bands
      const sortedItems = [...validItems].sort((a, b) => b.y - a.y); // PDF coordinates are bottom-up
      const horizontalBands = this.groupIntoHorizontalBands(sortedItems);
      this.log(`Page ${page.pageNum}: Created ${horizontalBands.length} horizontal bands`);
      
      // Phase 2: Within each band, cluster by X coordinate proximity
      for (let bandIndex = 0; bandIndex < horizontalBands.length; bandIndex++) {
        const band = horizontalBands[bandIndex];
        const bandRegions = this.clusterBandIntoRegions(band, page.pageNum, page.pageHeight);
        allRegions.push(...bandRegions);
        
        if (bandIndex % 10 === 0) {
          this.log(`Page ${page.pageNum}: Processed band ${bandIndex}/${horizontalBands.length}, found ${bandRegions.length} regions`);
        }
      }
    }
    
    // Phase 3: Filter and validate regions
    const validRegions = this.filterAndValidateRegions(allRegions);
    this.log(`Filtered to ${validRegions.length} valid menu regions across all pages`);
    
    return validRegions;
  }

  /**
   * Groups text items into horizontal bands based on Y-coordinate proximity
   */
  private groupIntoHorizontalBands(sortedItems: TextItem[]): TextItem[][] {
    const bands: TextItem[][] = [];
    const VERTICAL_THRESHOLD = 5; // Pixels - items within this distance are in same band
    
    for (const item of sortedItems) {
      let addedToBand = false;
      
      // Try to add to existing band
      for (const band of bands) {
        const bandY = band[0].y;
        if (Math.abs(item.y - bandY) <= VERTICAL_THRESHOLD) {
          band.push(item);
          addedToBand = true;
          break;
        }
      }
      
      // Create new band if item doesn't fit existing ones
      if (!addedToBand) {
        bands.push([item]);
      }
    }
    
    return bands;
  }

  /**
   * Clusters text items within a horizontal band into regions based on X-coordinate proximity
   */
  private clusterBandIntoRegions(band: TextItem[], pageNum: number, pageHeight: number): MenuRegion[] {
    if (band.length === 0) return [];
    
    // Sort by X coordinate
    const sortedBand = [...band].sort((a, b) => a.x - b.x);
    const regions: MenuRegion[] = [];
    const HORIZONTAL_THRESHOLD = 20; // Pixels - items within this distance are in same region
    
    let currentRegionItems: TextItem[] = [sortedBand[0]];
    
    for (let i = 1; i < sortedBand.length; i++) {
      const item = sortedBand[i];
      const lastItem = currentRegionItems[currentRegionItems.length - 1];
      
      // Check if item is close enough to be in same region
      const distance = item.x - (lastItem.x + lastItem.width);
      
      if (distance <= HORIZONTAL_THRESHOLD) {
        currentRegionItems.push(item);
      } else {
        // Create region from current items and start new region
        if (currentRegionItems.length > 0) {
          regions.push(this.createRegionFromItems(currentRegionItems, pageNum, pageHeight));
        }
        currentRegionItems = [item];
      }
    }
    
    // Add final region
    if (currentRegionItems.length > 0) {
      regions.push(this.createRegionFromItems(currentRegionItems, pageNum, pageHeight));
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
    
    // Calculate confidence based on region characteristics
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
    let confidence = 0.5; // Base confidence
    
    // Check for price patterns
    const hasPrice = items.some(item => /\$?\d+\.?\d*/.test(item.text));
    if (hasPrice) confidence += 0.3;
    
    // Check for reasonable text length (menu items are typically not too short or too long)
    const totalText = items.map(item => item.text).join(' ').trim();
    if (totalText.length >= 10 && totalText.length <= 200) confidence += 0.2;
    
    // Check for multiple text elements (name + description + price)
    if (items.length >= 2 && items.length <= 5) confidence += 0.1;
    
    // Check for consistent font sizes (menu items often have consistent typography)
    const fontSizes = items.map(item => item.fontSize || 12);
    const avgFontSize = fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length;
    const fontVariance = fontSizes.reduce((acc, size) => acc + Math.pow(size - avgFontSize, 2), 0) / fontSizes.length;
    if (fontVariance < 4) confidence += 0.1; // Low variance = consistent typography
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Filters regions based on confidence and characteristics
   */
  private filterAndValidateRegions(regions: MenuRegion[]): MenuRegion[] {
    const MIN_CONFIDENCE = 0.6;
    const MIN_REGION_WIDTH = 50; // Minimum width for a valid menu region
    const MIN_TEXT_LENGTH = 5; // Minimum text length for a valid menu region
    
    return regions.filter(region => {
      const totalText = region.items.map(item => item.text).join(' ').trim();
      
      return region.confidence >= MIN_CONFIDENCE &&
             region.boundingBox.width >= MIN_REGION_WIDTH &&
             totalText.length >= MIN_TEXT_LENGTH;
    });
  }

  /**
   * Extracts menu items from detected regions with PDF region images
   */
  private async extractMenuItemsWithRegions(regions: MenuRegion[], fallbackText: string, pdf: any): Promise<MenuItem[]> {
    this.log('Extracting menu items with PDF region images...');
    const menuItems: MenuItem[] = [];
    
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      const regionText = region.items.map(item => item.text).join(' ').trim();
      
      if (i % 20 === 0) {
        this.log(`Processing region ${i}/${regions.length}: "${regionText.substring(0, 50)}..."`);
      }
      
      const item = await this.parseMenuItemFromRegionWithImage(region, pdf);
      if (item) {
        menuItems.push(item);
      }
    }
    
    // If topological parsing yields few results, fall back to text-based parsing
    if (menuItems.length < 5) {
      this.log('Low yield from topological parsing, applying fallback text analysis...');
      const fallbackItems = this.parseMenuItems(fallbackText, []);
      menuItems.push(...fallbackItems);
    }
    
    // Remove duplicates and clean up
    return this.deduplicateItems(menuItems);
  }

  /**
   * Extracts menu items from detected regions using enhanced pattern matching (fallback)
   */
  private extractMenuItemsFromRegions(regions: MenuRegion[], fallbackText: string): MenuItem[] {
    this.log('Extracting menu items from topological regions...');
    const menuItems: MenuItem[] = [];
    
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      const regionText = region.items.map(item => item.text).join(' ').trim();
      
      if (i % 20 === 0) {
        this.log(`Processing region ${i}/${regions.length}: "${regionText.substring(0, 50)}..."`);
      }
      
      const item = this.parseMenuItemFromRegion(region);
      if (item) {
        menuItems.push(item);
      }
    }
    
    // If topological parsing yields few results, fall back to text-based parsing
    if (menuItems.length < 5) {
      this.log('Low yield from topological parsing, applying fallback text analysis...');
      const fallbackItems = this.parseMenuItems(fallbackText, []);
      menuItems.push(...fallbackItems);
    }
    
    // Remove duplicates and clean up
    return this.deduplicateItems(menuItems);
  }

  /**
   * Parses a single menu item from a topological region with extracted PDF image
   */
  private async parseMenuItemFromRegionWithImage(region: MenuRegion, pdf: any): Promise<MenuItem | null> {
    const items = region.items.sort((a, b) => a.x - b.x); // Sort left to right
    const allText = items.map(item => item.text).join(' ').trim();
    
    // Extract PDF region as image
    const regionImage = await this.extractRegionImage(region, pdf);
    
    // Look for price in the region
    let price = 0;
    let priceText = '';
    let nameAndDescription = allText;
    
    // Find price pattern
    const priceMatch = allText.match(/\$?(\d+\.?\d*)/);
    if (priceMatch) {
      price = parseFloat(priceMatch[1]);
      priceText = priceMatch[0];
      nameAndDescription = allText.replace(priceMatch[0], '').trim();
    }
    
    // Split name and description
    let name = nameAndDescription;
    let description = '';
    
    // Common patterns for separating name and description
    const separators = [' - ', ' • ', ' | ', '  ', '\n'];
    for (const separator of separators) {
      const parts = nameAndDescription.split(separator);
      if (parts.length >= 2) {
        name = parts[0].trim();
        description = parts.slice(1).join(separator).trim();
        break;
      }
    }
    
    // Validate the extracted data
    if (!name || name.length < 2) return null;
    if (price <= 0) return null;
    
    return {
      id: `region-${region.boundingBox.x}-${region.boundingBox.y}`,
      name: this.cleanItemName(name),
      price,
      description: description || undefined,
      category: this.categorizeItem(name, description),
      servingSize: this.estimateServingSize(name, description),
      regionImage, // Base64 encoded image of the PDF region
      confidence: region.confidence
    };
  }

  /**
   * Extracts a rectangular region from PDF as base64 image
   */
  private async extractRegionImage(region: MenuRegion, pdf: any): Promise<string | undefined> {
    try {
      // Get the page containing this region
      const page = await pdf.getPage(region.pageNumber);
      
      // Calculate scale factor for high-quality extraction
      const scale = 2.0; // 2x resolution for crisp text
      const viewport = page.getViewport({ scale });
      
      // Create canvas for rendering
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return undefined;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render the entire page first
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      // Calculate region coordinates (PDF uses bottom-up coordinates, canvas uses top-down)
      const regionX = region.boundingBox.x * scale;
      const regionY = (region.pageHeight - region.boundingBox.y - region.boundingBox.height) * scale;
      const regionWidth = region.boundingBox.width * scale;
      const regionHeight = region.boundingBox.height * scale;
      
      // Add some padding around the region for better visual context
      const padding = 10 * scale;
      const extractX = Math.max(0, regionX - padding);
      const extractY = Math.max(0, regionY - padding);
      const extractWidth = Math.min(canvas.width - extractX, regionWidth + 2 * padding);
      const extractHeight = Math.min(canvas.height - extractY, regionHeight + 2 * padding);
      
      // Extract the region using getImageData
      const imageData = context.getImageData(extractX, extractY, extractWidth, extractHeight);
      
      // Create a new canvas for the extracted region
      const regionCanvas = document.createElement('canvas');
      const regionContext = regionCanvas.getContext('2d');
      if (!regionContext) return undefined;
      
      regionCanvas.width = extractWidth;
      regionCanvas.height = extractHeight;
      regionContext.putImageData(imageData, 0, 0);
      
      // Convert to base64
      return regionCanvas.toDataURL('image/png', 0.9);
      
    } catch (error) {
      this.log(`Failed to extract region image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return undefined;
    }
  }

  /**
   * Parses a single menu item from a topological region (fallback without image)
   */
  private parseMenuItemFromRegion(region: MenuRegion): MenuItem | null {
    const items = region.items.sort((a, b) => a.x - b.x); // Sort left to right
    const allText = items.map(item => item.text).join(' ').trim();
    
    // Look for price in the region
    let price = 0;
    let priceText = '';
    let nameAndDescription = allText;
    
    // Find price pattern
    const priceMatch = allText.match(/\$?(\d+\.?\d*)/);
    if (priceMatch) {
      price = parseFloat(priceMatch[1]);
      priceText = priceMatch[0];
      nameAndDescription = allText.replace(priceMatch[0], '').trim();
    }
    
    // Split name and description
    let name = nameAndDescription;
    let description = '';
    
    // Common patterns for separating name and description
    const separators = [' - ', ' • ', ' | ', '  ', '\n'];
    for (const separator of separators) {
      const parts = nameAndDescription.split(separator);
      if (parts.length >= 2) {
        name = parts[0].trim();
        description = parts.slice(1).join(separator).trim();
        break;
      }
    }
    
    // Validate the extracted data
    if (!name || name.length < 2) return null;
    if (price <= 0) return null;
    
    return {
      id: `region-${region.boundingBox.x}-${region.boundingBox.y}`,
      name: this.cleanItemName(name),
      price,
      description: description || undefined,
      category: this.categorizeItem(name, description),
      servingSize: this.estimateServingSize(name, description)
    };
  }
  
  private parseMenuItems(text: string, _textItems: TextItem[]): MenuItem[] {
    this.log('Starting menu item pattern matching...');
    const menuItems: MenuItem[] = [];
    const lines = text.split('\n').filter(line => line.trim());
    this.log(`Split text into ${lines.length} lines for processing`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (i % 50 === 0) {
        this.log(`Processing line ${i}/${lines.length}: "${line.substring(0, 50)}..."`);
      }
      
      // Try multiple patterns for menu items
      const patterns = [
        // Pattern 1: "Item Name $12.99" or "Item Name 12.99"
        /^(.+?)\s+\$?(\d+\.?\d*)\s*$/,
        // Pattern 2: "Item Name - Description $12.99"
        /^(.+?)\s*-\s*(.+?)\s+\$?(\d+\.?\d*)\s*$/,
        // Pattern 3: Price at beginning "$12.99 Item Name"
        /^\$?(\d+\.?\d*)\s+(.+)$/,
        // Pattern 4: Multi-line with price on next line
        /^(.{10,})\s*$/
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          let name = '';
          let price = 0;
          let description = '';
          
          if (pattern === patterns[0]) {
            // Simple name + price
            name = match[1].trim();
            price = parseFloat(match[2]);
          } else if (pattern === patterns[1]) {
            // Name + description + price
            name = match[1].trim();
            description = match[2].trim();
            price = parseFloat(match[3]);
          } else if (pattern === patterns[2]) {
            // Price + name
            price = parseFloat(match[1]);
            name = match[2].trim();
          } else if (pattern === patterns[3]) {
            // Check next line for price
            name = match[1].trim();
            if (i + 1 < lines.length) {
              const nextLine = lines[i + 1].trim();
              const priceMatch = nextLine.match(/^\$?(\d+\.?\d*)\s*$/);
              if (priceMatch) {
                price = parseFloat(priceMatch[1]);
                i++; // Skip next line as we processed it
              }
            }
          }
          
          if (name && price > 0) {
            this.log(`Found menu item: "${name}" - $${price}`);
            const category = this.categorizeItem(name, description);
            const servingSize = this.estimateServingSize(name, description);
            
            menuItems.push({
              id: `item-${menuItems.length + 1}`,
              name: this.cleanItemName(name),
              price,
              description: description || undefined,
              category,
              servingSize
            });
            break;
          }
        }
      }
    }
    
    return this.deduplicateItems(menuItems);
  }
  
  private categorizeItem(name: string, description: string): string {
    const text = (name + ' ' + description).toLowerCase();
    
    const categories = {
      'Appetizers': ['appetizer', 'starter', 'wings', 'nachos', 'dip', 'bread', 'bruschetta', 'calamari'],
      'Salads': ['salad', 'caesar', 'greens', 'lettuce'],
      'Soups': ['soup', 'bisque', 'chowder', 'broth'],
      'Mains': ['entree', 'main', 'chicken', 'beef', 'pork', 'fish', 'salmon', 'steak', 'pasta', 'pizza', 'burger', 'sandwich'],
      'Sides': ['side', 'fries', 'rice', 'potato', 'vegetable', 'beans'],
      'Desserts': ['dessert', 'cake', 'pie', 'ice cream', 'chocolate', 'cookie', 'tiramisu'],
      'Beverages': ['drink', 'coffee', 'tea', 'soda', 'juice', 'beer', 'wine', 'cocktail', 'water']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }
    
    return 'Other';
  }
  
  private estimateServingSize(name: string, description: string): number {
    const text = (name + ' ' + description).toLowerCase();
    
    // Look for serving size indicators
    if (text.includes('family') || text.includes('large')) return 4;
    if (text.includes('sharing') || text.includes('platter')) return 6;
    if (text.includes('individual') || text.includes('personal')) return 1;
    if (text.includes('pizza') && text.includes('large')) return 4;
    if (text.includes('pizza') && text.includes('medium')) return 3;
    if (text.includes('pizza') && text.includes('small')) return 2;
    
    // Default serving size based on category
    const category = this.categorizeItem(name, description);
    switch (category) {
      case 'Appetizers': return 2;
      case 'Salads': return 1;
      case 'Soups': return 1;
      case 'Mains': return 1;
      case 'Sides': return 2;
      case 'Desserts': return 1;
      case 'Beverages': return 1;
      default: return 1;
    }
  }
  
  private cleanItemName(name: string): string {
    // Remove common prefixes and suffixes
    return name
      .replace(/^\d+\.\s*/, '') // Remove numbering
      .replace(/\s*\.\.\.*\s*$/, '') // Remove trailing dots
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
  
  private deduplicateItems(items: MenuItem[]): MenuItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
      const key = item.name.toLowerCase() + item.price;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}