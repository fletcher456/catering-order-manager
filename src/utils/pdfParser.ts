import * as pdfjsLib from 'pdfjs-dist';
import { AdaptiveBayesianOptimizer } from './bayesianOptimizer';
import { 
  MenuItem, 
  TextItem, 
  MenuRegion, 
  NumberClassification, 
  TypographyFingerprint, 
  StructuralPattern,
  OptimizationParameters,
  OptimizationResult,
  ProcessingMetrics,
  ProcessingState,
  LogEntry
} from '../types';

// Configure PDF.js worker to use local bundle
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';
}

interface DocumentFeatures {
  pageCount: number;
  totalTextItems: number;
  avgFontSize: number;
  pricePatternDensity: number;
  typographyVariety: number;
  spatialComplexity: number;
}

interface ExtractionResult {
  menuItems: MenuItem[];
  processingMetrics: ProcessingMetrics;
  optimizationResult: OptimizationResult;
  logs: LogEntry[];
}

export class MenuPDFParser {
  private logCallback?: (message: string) => void;
  private stateCallback?: (state: ProcessingState) => void;
  private optimizer: AdaptiveBayesianOptimizer;
  private logs: LogEntry[] = [];
  private processingStartTime: number = 0;
  private documentFeatures?: DocumentFeatures;
  private chineseRestaurantMode: boolean = false;
  private pageCanvasCache: Map<number, HTMLCanvasElement> = new Map();
  private detectedRegions: MenuRegion[] = [];
  
  // Optimization results cache
  private currentParameters?: OptimizationParameters;
  private numberClassifications: NumberClassification[] = [];
  private typographyProfiles: Map<string, TypographyFingerprint> = new Map();
  private structuralPatterns: StructuralPattern[] = [];

  constructor() {
    this.optimizer = new AdaptiveBayesianOptimizer(
      25, // maxIterations
      0.015, // convergenceThreshold
      (message) => this.log(message, 'debug', 'optimization')
    );
  }

  setLogCallback(callback: (message: string) => void): void {
    this.logCallback = callback;
  }

  setStateCallback(callback: (state: ProcessingState) => void): void {
    this.stateCallback = callback;
  }

  setChineseRestaurantMode(enabled: boolean): void {
    this.chineseRestaurantMode = enabled;
    this.log(`Chinese restaurant mode ${enabled ? 'enabled' : 'disabled'}`, 'info', 'configuration');
  }

  private log(message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info', phase: string = 'general'): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      phase,
      level,
      message
    };
    
    this.logs.push(entry);
    
    if (this.logCallback) {
      this.logCallback(`[${phase.toUpperCase()}] ${message}`);
    }
  }

  private updateState(phase: string, progress: number, message: string, optimizationIteration?: number): void {
    const state: ProcessingState = {
      phase,
      progress,
      message,
      chineseRestaurantMode: this.chineseRestaurantMode,
      optimizationIteration,
      currentParameters: this.currentParameters,
      metrics: this.getCurrentMetrics()
    };

    if (this.stateCallback) {
      this.stateCallback(state);
    }
  }

  private getCurrentMetrics(): Partial<ProcessingMetrics> {
    return {
      processingTime: Date.now() - this.processingStartTime,
      optimizationIterations: this.optimizer.getOptimizationMetrics().currentIteration
    };
  }

  async extractMenuFromPDF(file: File): Promise<ExtractionResult> {
    this.processingStartTime = Date.now();
    this.logs = [];
    
    try {
      this.updateState('initialization', 0, 'Starting PDF analysis');
      this.log('Starting comprehensive menu extraction with Bayesian optimization', 'info', 'initialization');

      // Load and analyze PDF
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      this.updateState('text_extraction', 10, 'Extracting text content from PDF');
      const pageData = await this.extractTextContent(pdf);
      
      // Analyze document features for optimization
      this.documentFeatures = this.analyzeDocumentFeatures(pageData);
      this.log(`Analyzed document: ${this.documentFeatures.pageCount} pages, ${this.documentFeatures.totalTextItems} text items`, 'info', 'analysis');

      // Run Bayesian optimization
      this.updateState('optimization', 20, 'Running Bayesian parameter optimization');
      const optimizationResult = await this.runOptimization(pageData);
      this.currentParameters = optimizationResult.parameters;

      // Chinese restaurant mode: detect visual boxes first
      if (this.chineseRestaurantMode) {
        this.updateState('box_detection', 40, 'Detecting visual menu boxes');
        await this.detectVisualBoxes(pageData, optimizationResult.parameters);
      }

      // Execute optimized pipeline
      this.updateState('processing', 50, 'Processing with optimized parameters');
      const menuItems = await this.executeOptimizedPipeline(pageData, pdf);

      const processingMetrics: ProcessingMetrics = {
        processingTime: Date.now() - this.processingStartTime,
        memoryUsage: this.estimateMemoryUsage(),
        regionsDetected: this.logs.filter(log => log.phase === 'spatial_clustering').length,
        itemsExtracted: menuItems.length,
        averageConfidence: menuItems.reduce((sum, item) => sum + (item.confidence || 0), 0) / menuItems.length,
        optimizationIterations: optimizationResult.convergenceMetrics.iterations
      };

      this.updateState('complete', 100, `Extracted ${menuItems.length} menu items`);
      this.log(`Extraction complete: ${menuItems.length} items, ${processingMetrics.averageConfidence.toFixed(2)} avg confidence`, 'info', 'complete');

      return {
        menuItems,
        processingMetrics,
        optimizationResult,
        logs: this.logs
      };

    } catch (error) {
      this.log(`Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'error');
      throw error;
    }
  }

  private async extractTextContent(pdf: any): Promise<{ textItems: TextItem[], pageNum: number, pageHeight: number }[]> {
    const pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[] = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      this.updateState('text_extraction', 10 + (pageNum / pdf.numPages) * 10, `Extracting text from page ${pageNum}`);
      
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();
      
      // Cache page canvas for Chinese restaurant mode
      if (this.chineseRestaurantMode) {
        await this.cachePageCanvas(page, pageNum);
      }
      
      const textItems: TextItem[] = textContent.items.map((item: any) => ({
        text: item.str,
        x: item.transform[4],
        y: viewport.height - item.transform[5], // Convert to top-down coordinates
        width: item.width,
        height: item.height,
        fontSize: item.height,
        fontName: item.fontName,
        fontWeight: this.extractFontWeight(item.fontName),
        fontStyle: this.extractFontStyle(item.fontName)
      }));

      pageData.push({
        textItems: textItems.filter(item => item.text.trim().length > 0),
        pageNum,
        pageHeight: viewport.height
      });
    }

    return pageData;
  }

  private extractFontWeight(fontName: string): string {
    const name = fontName.toLowerCase();
    if (name.includes('bold') || name.includes('heavy') || name.includes('black')) return 'bold';
    if (name.includes('light') || name.includes('thin')) return 'light';
    if (name.includes('medium')) return 'medium';
    return 'normal';
  }

  private extractFontStyle(fontName: string): string {
    const name = fontName.toLowerCase();
    if (name.includes('italic') || name.includes('oblique')) return 'italic';
    return 'normal';
  }

  private analyzeDocumentFeatures(pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[]): DocumentFeatures {
    const allTextItems = pageData.flatMap(page => page.textItems);
    
    const fontSizes = allTextItems.map(item => item.fontSize || 12);
    const avgFontSize = fontSizes.reduce((sum, size) => sum + size, 0) / fontSizes.length;
    
    const pricePatterns = allTextItems.filter(item => /\$\d+\.?\d*/.test(item.text));
    const pricePatternDensity = pricePatterns.length / allTextItems.length;
    
    const uniqueFonts = new Set(allTextItems.map(item => item.fontName)).size;
    const uniqueSizes = new Set(fontSizes).size;
    const typographyVariety = (uniqueFonts + uniqueSizes) / allTextItems.length;
    
    const spatialComplexity = this.calculateSpatialComplexity(allTextItems);

    return {
      pageCount: pageData.length,
      totalTextItems: allTextItems.length,
      avgFontSize,
      pricePatternDensity,
      typographyVariety,
      spatialComplexity
    };
  }

  private calculateSpatialComplexity(textItems: TextItem[]): number {
    if (textItems.length < 2) return 0;
    
    const distances = [];
    for (let i = 0; i < Math.min(textItems.length, 100); i++) {
      for (let j = i + 1; j < Math.min(textItems.length, 100); j++) {
        const dx = textItems[i].x - textItems[j].x;
        const dy = textItems[i].y - textItems[j].y;
        distances.push(Math.sqrt(dx * dx + dy * dy));
      }
    }
    
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
    
    return Math.sqrt(variance) / avgDistance; // Coefficient of variation
  }

  private async runOptimization(pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[]): Promise<OptimizationResult> {
    this.log('Starting Bayesian parameter optimization', 'info', 'optimization');
    
    const objectiveFunction = async (params: OptimizationParameters): Promise<number> => {
      try {
        // Run abbreviated pipeline for optimization
        const testResults = await this.evaluateParameters(params, pageData);
        return testResults.overallScore;
      } catch (error) {
        this.log(`Parameter evaluation failed: ${error}`, 'warn', 'optimization');
        return 0;
      }
    };

    return await this.optimizer.optimize(objectiveFunction);
  }

  private async evaluateParameters(params: OptimizationParameters, pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[]): Promise<{ overallScore: number; accuracy: number; speed: number; confidence: number; memory: number }> {
    const startTime = Date.now();
    
    try {
      // Phase 0: Heuristic Analysis
      const heuristicResults = this.performHeuristicAnalysis(pageData, params.phase0);
      
      // Phase 1: Spatial Clustering  
      const regions = this.detectMenuRegions(pageData, params.phase1);
      
      // Phase 2: Region Processing
      const validatedRegions = this.filterAndValidateRegions(regions, params.phase2);
      
      // Phase 3: Menu Assembly (simplified)
      const menuItems = this.assembleMenuItems(validatedRegions, params.phase3);
      
      const processingTime = Date.now() - startTime;
      
      // Calculate performance metrics
      const accuracy = this.calculateAccuracy(menuItems, validatedRegions);
      const speed = Math.max(0, 1 - (processingTime / 5000)); // Normalize to 5 second baseline
      const confidence = menuItems.reduce((sum, item) => sum + (item.confidence || 0), 0) / Math.max(menuItems.length, 1);
      const memory = Math.max(0, 1 - (this.estimateMemoryUsage() / 100000000)); // 100MB baseline
      
      const overallScore = 0.4 * accuracy + 0.3 * speed + 0.2 * confidence + 0.1 * memory;
      
      return { overallScore, accuracy, speed, confidence, memory };
      
    } catch (error) {
      return { overallScore: 0, accuracy: 0, speed: 0, confidence: 0, memory: 0 };
    }
  }

  private calculateAccuracy(menuItems: MenuItem[], regions: MenuRegion[]): number {
    if (menuItems.length === 0) return 0;
    
    // Heuristic accuracy based on extraction completeness and quality
    const extractionRatio = Math.min(1, menuItems.length / Math.max(regions.length, 1));
    const avgConfidence = menuItems.reduce((sum, item) => sum + (item.confidence || 0), 0) / menuItems.length;
    const priceValidation = menuItems.filter(item => item.price > 0).length / menuItems.length;
    
    return (extractionRatio + avgConfidence + priceValidation) / 3;
  }

  private estimateMemoryUsage(): number {
    // Rough estimation based on data structures
    const textItemsSize = this.logs.length * 200; // Approximate size per log entry
    const regionsSize = this.typographyProfiles.size * 500;
    const classificationsSize = this.numberClassifications.length * 100;
    
    return textItemsSize + regionsSize + classificationsSize;
  }

  private async executeOptimizedPipeline(pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[], pdf: any): Promise<MenuItem[]> {
    if (!this.currentParameters) {
      throw new Error('No optimization parameters available');
    }

    this.updateState('heuristic_analysis', 55, 'Phase 0: Heuristic Analysis');
    this.performHeuristicAnalysis(pageData, this.currentParameters.phase0);

    this.updateState('spatial_clustering', 65, 'Phase 1: Spatial Clustering');
    const regions = this.detectMenuRegions(pageData, this.currentParameters.phase1);

    this.updateState('region_processing', 75, 'Phase 2: Region Processing & Validation');
    const validatedRegions = await this.processAndValidateRegions(regions, pdf, this.currentParameters.phase2);

    this.updateState('menu_assembly', 85, 'Phase 3: Menu Item Assembly & Validation');
    const menuItems = await this.assembleAndValidateMenuItems(validatedRegions, this.currentParameters.phase3);

    this.updateState('finalization', 95, 'Finalizing extraction');
    return this.deduplicateItems(menuItems);
  }

  // Phase 0: Heuristic Analysis Engine
  private performHeuristicAnalysis(pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[], params: any): void {
    this.log('Starting heuristic analysis', 'info', 'heuristic_analysis');
    
    const allTextItems = pageData.flatMap(page => page.textItems);
    
    // Number classification
    this.numberClassifications = this.classifyNumbers(allTextItems, params);
    
    // Typography fingerprinting
    this.buildTypographyFingerprints(pageData, params);
    
    // Pattern extraction
    this.extractStructuralPatterns(pageData, params);
    
    this.log(`Classified ${this.numberClassifications.length} numbers, identified ${this.typographyProfiles.size} typography profiles`, 'info', 'heuristic_analysis');
  }

  private classifyNumbers(textItems: TextItem[], params: any): NumberClassification[] {
    const classifications: NumberClassification[] = [];
    
    textItems.forEach(item => {
      const numbers = this.extractNumbers(item.text);
      numbers.forEach(value => {
        const classification = this.classifyNumber(value, item.text, item, params);
        if (classification.confidence >= params.numberClassificationConfidence) {
          classifications.push(classification);
        }
      });
    });
    
    return classifications;
  }

  private extractNumbers(text: string): number[] {
    const patterns = [
      /\$(\d+\.?\d*)/g,           // Prices
      /(\d+\.?\d*)\s*calories?/gi, // Calories
      /(\d+\.?\d*)\s*(oz|lb|kg|g|ml|l)/gi, // Measurements
      /(\d+)/g                     // General numbers
    ];
    
    const numbers: number[] = [];
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = parseFloat(match[1] || match[0]);
        if (!isNaN(value)) {
          numbers.push(value);
        }
      }
    });
    
    return [...new Set(numbers)]; // Remove duplicates
  }

  private classifyNumber(value: number, text: string, item: TextItem, params: any): NumberClassification {
    let type: NumberClassification['type'] = 'unknown';
    let confidence = 0;
    let reasoning = '';

    // Price classification
    if (text.includes('$') && value >= 1 && value <= 100) {
      type = 'price';
      confidence = 0.9;
      reasoning = 'Contains dollar sign and reasonable price range';
    }
    // Calorie classification
    else if (/calories?/i.test(text) && value >= 50 && value <= 2000) {
      type = 'calorie';
      confidence = 0.85;
      reasoning = 'Contains calorie keyword with reasonable range';
    }
    // Measurement classification
    else if (/(oz|lb|kg|g|ml|l)/i.test(text)) {
      type = 'measurement';
      confidence = 0.8;
      reasoning = 'Contains measurement unit';
    }
    // Count classification
    else if (value <= 20 && Number.isInteger(value)) {
      type = 'count';
      confidence = 0.6;
      reasoning = 'Small integer, likely a count';
    }
    // Item number classification
    else if (item.x < 50 && Number.isInteger(value)) {
      type = 'item_number';
      confidence = 0.7;
      reasoning = 'Integer at left margin, likely item number';
    }

    return { value, type, confidence, reasoning };
  }

  private buildTypographyFingerprints(pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[], params: any): void {
    const fontGroups = new Map<string, TextItem[]>();
    
    // Group by font characteristics
    pageData.forEach(page => {
      page.textItems.forEach(item => {
        const key = `${item.fontName}_${item.fontSize}_${item.fontWeight}`;
        if (!fontGroups.has(key)) {
          fontGroups.set(key, []);
        }
        fontGroups.get(key)!.push(item);
      });
    });

    // Build fingerprints for each group
    fontGroups.forEach((items, key) => {
      if (items.length >= 3) { // Minimum sample size
        const texts = items.map(item => item.text);
        const avgLength = texts.reduce((sum, text) => sum + text.length, 0) / texts.length;
        const patterns = this.extractCommonPatterns(texts);
        
        const fingerprint: TypographyFingerprint = {
          fontFamily: items[0].fontName || 'unknown',
          fontSize: items[0].fontSize || 12,
          fontWeight: items[0].fontWeight || 'normal',
          avgLength,
          commonPatterns: patterns,
          confidence: Math.min(0.95, items.length / 10) // More samples = higher confidence
        };
        
        this.typographyProfiles.set(key, fingerprint);
      }
    });
  }

  private extractCommonPatterns(texts: string[]): string[] {
    const patterns: Map<string, number> = new Map();
    
    texts.forEach(text => {
      // Extract word patterns
      const words = text.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) {
          patterns.set(word, (patterns.get(word) || 0) + 1);
        }
      });
      
      // Extract character patterns
      if (/^\d+\.?\d*$/.test(text)) patterns.set('NUMBER_PATTERN', (patterns.get('NUMBER_PATTERN') || 0) + 1);
      if (/^\$/.test(text)) patterns.set('PRICE_PATTERN', (patterns.get('PRICE_PATTERN') || 0) + 1);
      if (text.length > 20) patterns.set('LONG_TEXT', (patterns.get('LONG_TEXT') || 0) + 1);
    });
    
    return Array.from(patterns.entries())
      .filter(([_, count]) => count >= Math.max(2, texts.length * 0.3))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, _]) => pattern);
  }

  private extractStructuralPatterns(pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[], params: any): void {
    // This is a simplified implementation - the full version would analyze spatial relationships
    // between different typography profiles to identify name/description/price patterns
    this.structuralPatterns = [];
    
    this.log('Structural pattern extraction completed', 'debug', 'heuristic_analysis');
  }

  // Phase 1: Spatial Clustering Algorithm
  private detectMenuRegions(pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[], params: any): MenuRegion[] {
    this.log('Starting spatial clustering', 'info', 'spatial_clustering');
    
    const allRegions: MenuRegion[] = [];
    
    pageData.forEach(page => {
      const regions = this.clusterPageIntoRegions(page.textItems, page.pageNum, page.pageHeight, params);
      allRegions.push(...regions);
    });

    const validatedRegions = this.filterAndValidateRegions(allRegions, params);
    this.log(`Detected ${validatedRegions.length} menu regions`, 'info', 'spatial_clustering');
    
    return validatedRegions;
  }

  private clusterPageIntoRegions(textItems: TextItem[], pageNum: number, pageHeight: number, params: any): MenuRegion[] {
    if (textItems.length === 0) return [];
    
    // Sort by Y coordinate for horizontal band formation
    const sortedItems = [...textItems].sort((a, b) => a.y - b.y);
    
    // Group into horizontal bands
    const bands = this.groupIntoHorizontalBands(sortedItems, params.yProximityThreshold);
    
    // Cluster each band into regions
    const regions: MenuRegion[] = [];
    bands.forEach(band => {
      const bandRegions = this.clusterBandIntoRegions(band, pageNum, pageHeight, params);
      regions.push(...bandRegions);
    });
    
    return regions;
  }

  private groupIntoHorizontalBands(sortedItems: TextItem[], yThreshold: number): TextItem[][] {
    const bands: TextItem[][] = [];
    let currentBand: TextItem[] = [];
    
    sortedItems.forEach(item => {
      if (currentBand.length === 0) {
        currentBand.push(item);
      } else {
        const lastItem = currentBand[currentBand.length - 1];
        const emDistance = Math.abs(item.y - lastItem.y) / (item.fontSize || 12);
        
        if (emDistance <= yThreshold) {
          currentBand.push(item);
        } else {
          if (currentBand.length > 0) {
            bands.push(currentBand);
          }
          currentBand = [item];
        }
      }
    });
    
    if (currentBand.length > 0) {
      bands.push(currentBand);
    }
    
    return bands;
  }

  private clusterBandIntoRegions(band: TextItem[], pageNum: number, pageHeight: number, params: any): MenuRegion[] {
    if (band.length === 0) return [];
    
    // Sort band by X coordinate
    const sortedBand = [...band].sort((a, b) => a.x - b.x);
    
    const regions: MenuRegion[] = [];
    let currentRegion: TextItem[] = [];
    
    sortedBand.forEach(item => {
      if (currentRegion.length === 0) {
        currentRegion.push(item);
      } else {
        const lastItem = currentRegion[currentRegion.length - 1];
        const emDistance = Math.abs(item.x - (lastItem.x + lastItem.width)) / (item.fontSize || 12);
        
        if (emDistance <= params.xDistanceThreshold) {
          currentRegion.push(item);
        } else {
          if (currentRegion.length >= 2) { // Minimum items for a region
            const region = this.createRegionFromItems(currentRegion, pageNum, pageHeight);
            if (region.confidence >= params.minimumConfidenceThreshold) {
              regions.push(region);
            }
          }
          currentRegion = [item];
        }
      }
    });
    
    // Process final region
    if (currentRegion.length >= 2) {
      const region = this.createRegionFromItems(currentRegion, pageNum, pageHeight);
      if (region.confidence >= params.minimumConfidenceThreshold) {
        regions.push(region);
      }
    }
    
    return regions;
  }

  private createRegionFromItems(items: TextItem[], pageNum: number, pageHeight: number): MenuRegion {
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
    
    const confidence = this.calculateRegionConfidence(items, boundingBox);
    
    return {
      items,
      boundingBox,
      confidence,
      pageNumber: pageNum,
      pageHeight
    };
  }

  private calculateRegionConfidence(items: TextItem[], boundingBox: any): number {
    let score = 0;
    
    // Text length variety (names short, descriptions long)
    const lengths = items.map(item => item.text.length);
    const lengthVariety = Math.max(...lengths) - Math.min(...lengths);
    score += Math.min(0.3, lengthVariety / 50);
    
    // Price pattern presence
    const hasPricePattern = items.some(item => /\$\d+\.?\d*/.test(item.text));
    if (hasPricePattern) score += 0.4;
    
    // Item count (3-6 items typical for menu item)
    const itemCount = items.length;
    if (itemCount >= 3 && itemCount <= 6) {
      score += 0.2;
    }
    
    // Typography consistency
    const fontNames = new Set(items.map(item => item.fontName));
    if (fontNames.size <= 2) score += 0.1;
    
    return Math.min(1.0, score);
  }

  // Phase 2: Region Processing & Validation
  private filterAndValidateRegions(regions: MenuRegion[], params: any): MenuRegion[] {
    return regions.filter(region => {
      // Size constraints
      const widthEm = region.boundingBox.width / 12; // Approximate em conversion
      const heightEm = region.boundingBox.height / 12;
      
      if (widthEm < params.dimensionalConstraints?.minWidthEm || 
          heightEm < params.dimensionalConstraints?.minHeightEm) {
        return false;
      }
      
      // Confidence threshold
      return region.confidence >= (params.confidenceFilteringThreshold || 0.5);
    });
  }

  private async processAndValidateRegions(regions: MenuRegion[], pdf: any, params: any): Promise<MenuRegion[]> {
    const processedRegions: MenuRegion[] = [];
    
    for (const region of regions) {
      try {
        // Extract region image for visual validation
        const regionImage = await this.extractRegionImage(region, pdf);
        
        // Validate using heuristics
        const isValid = this.validateRegionWithHeuristics(region, params);
        
        if (isValid) {
          // Create enhanced region with image metadata
          const enhancedRegion = { 
            ...region,
            regionImage
          };
          processedRegions.push(enhancedRegion);
        }
      } catch (error) {
        this.log(`Failed to process region: ${error}`, 'warn', 'region_processing');
      }
    }
    
    return processedRegions;
  }

  private async extractRegionImage(region: MenuRegion, pdf: any): Promise<string | undefined> {
    try {
      const page = await pdf.getPage(region.pageNumber);
      const viewport = page.getViewport({ scale: 2 }); // Higher resolution
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({ canvasContext: context, viewport }).promise;
      
      // Extract region with padding
      const padding = 10;
      const regionCanvas = document.createElement('canvas');
      const regionContext = regionCanvas.getContext('2d')!;
      
      const scaledBox = {
        x: region.boundingBox.x * 2 - padding,
        y: region.boundingBox.y * 2 - padding,
        width: region.boundingBox.width * 2 + padding * 2,
        height: region.boundingBox.height * 2 + padding * 2
      };
      
      regionCanvas.width = Math.min(200, scaledBox.width); // Limit size
      regionCanvas.height = Math.min(100, scaledBox.height);
      
      regionContext.drawImage(
        canvas,
        scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height,
        0, 0, regionCanvas.width, regionCanvas.height
      );
      
      return regionCanvas.toDataURL('image/png');
    } catch (error) {
      this.log(`Failed to extract region image: ${error}`, 'warn', 'region_processing');
      return undefined;
    }
  }

  private validateRegionWithHeuristics(region: MenuRegion, params: any): boolean {
    const texts = region.items.map(item => item.text);
    const combinedText = texts.join(' ');
    
    // Name validation (should have reasonable length, title case)
    const hasName = texts.some(text => text.length >= 3 && text.length <= 30);
    
    // Description validation (longer text with ingredient keywords)
    const hasDescription = texts.some(text => 
      text.length > 10 && /\b(with|and|or|served|topped|seasoned)\b/i.test(text)
    );
    
    // Price validation
    const hasPrice = texts.some(text => /\$\d+\.?\d*/.test(text));
    
    const weights = params.heuristicValidationWeights || {
      nameLength: 0.25,
      descriptionComplexity: 0.25,
      priceValidation: 0.5
    };
    
    const score = (hasName ? weights.nameLength : 0) +
                  (hasDescription ? weights.descriptionComplexity : 0) +
                  (hasPrice ? weights.priceValidation : 0);
    
    return score >= (params.extractionQualityThreshold || 0.7);
  }

  // Phase 3: Menu Item Assembly & Validation
  private assembleMenuItems(regions: MenuRegion[], params: any): MenuItem[] {
    const menuItems: MenuItem[] = [];
    
    regions.forEach((region, index) => {
      const item = this.parseMenuItemFromRegion(region, index);
      if (item) {
        menuItems.push(item);
      }
    });
    
    return menuItems;
  }

  private async assembleAndValidateMenuItems(regions: MenuRegion[], params: any): Promise<MenuItem[]> {
    let menuItems = this.assembleMenuItems(regions, params);
    
    // Bootstrap assessment
    if (menuItems.length < 5 || this.calculateAverageConfidence(menuItems) < params.bootstrapQualityThreshold) {
      this.log('Running bootstrap fallback processing', 'info', 'menu_assembly');
      const fallbackItems = await this.runBootstrapFallback(regions);
      menuItems = [...menuItems, ...fallbackItems];
    }
    
    // Document-wide validation
    menuItems = this.validateMenuItemsWithHeuristics(menuItems, params);
    
    return menuItems;
  }

  private calculateAverageConfidence(items: MenuItem[]): number {
    if (items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (item.confidence || 0), 0) / items.length;
  }

  private async runBootstrapFallback(regions: MenuRegion[]): Promise<MenuItem[]> {
    // Simplified fallback - in practice this would implement full text parsing
    const fallbackItems: MenuItem[] = [];
    
    regions.forEach((region, index) => {
      const texts = region.items.map(item => item.text);
      const combinedText = texts.join(' ');
      
      // Simple pattern matching for fallback
      const priceMatch = combinedText.match(/\$(\d+\.?\d*)/);
      if (priceMatch) {
        const nameText = texts.find(text => text.length > 3 && !text.includes('$')) || 'Unknown Item';
        
        fallbackItems.push({
          id: `fallback-${index}`,
          name: nameText.trim(),
          price: parseFloat(priceMatch[1]),
          description: texts.find(text => text.length > 20) || '',
          category: 'Other',
          confidence: 0.4,
          extractionMetadata: {
            sourceRegion: region,
            processingPhase: 'bootstrap_fallback',
            optimizationParameters: this.currentParameters || {}
          }
        });
      }
    });
    
    return fallbackItems;
  }

  private parseMenuItemFromRegion(region: MenuRegion, index: number): MenuItem | null {
    // Use Chinese restaurant mode parser if enabled
    if (this.chineseRestaurantMode) {
      return this.parseChineseMenuItemFromRegion(region, index);
    }
    
    const texts = region.items.map(item => item.text);
    
    // Find price
    let price = 0;
    let priceText = '';
    for (const text of texts) {
      const priceMatch = text.match(/\$(\d+\.?\d*)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1]);
        priceText = text;
        break;
      }
    }
    
    if (price === 0) return null;
    
    // Find name (shortest non-price text)
    const nonPriceTexts = texts.filter(text => text !== priceText && text.length > 2);
    if (nonPriceTexts.length === 0) return null;
    
    const name = nonPriceTexts.reduce((shortest, text) => 
      text.length < shortest.length ? text : shortest
    );
    
    // Find description (longest remaining text)
    const description = nonPriceTexts
      .filter(text => text !== name)
      .reduce((longest, text) => 
        text.length > longest.length ? text : longest, ''
      );
    
    const category = this.categorizeItem(name, description);
    
    return {
      id: `item-${index}`,
      name: this.cleanItemName(name),
      price,
      description: description || undefined,
      category,
      servingSize: this.estimateServingSize(name, description),
      confidence: region.confidence,
      regionImage: region.regionImage,
      extractionMetadata: {
        sourceRegion: region,
        processingPhase: 'region_parsing',
        optimizationParameters: this.currentParameters || {},
        chineseRestaurantMode: this.chineseRestaurantMode
      }
    };
  }

  private validateMenuItemsWithHeuristics(items: MenuItem[], params: any): MenuItem[] {
    // Remove duplicates
    const uniqueItems = this.deduplicateItems(items);
    
    // Validate prices (economic clustering)
    return uniqueItems.filter(item => {
      if (item.price <= 0 || item.price > 200) return false;
      if (item.name.length < 2 || item.name.length > 100) return false;
      return true;
    });
  }

  private categorizeItem(name: string, description: string): string {
    const text = (name + ' ' + description).toLowerCase();
    
    if (/salad|green|lettuce|spinach/.test(text)) return 'Salads';
    if (/soup|broth|bisque|chowder/.test(text)) return 'Soups';
    if (/appetizer|starter|wing|nachos|dip/.test(text)) return 'Appetizers';
    if (/burger|sandwich|wrap|panini/.test(text)) return 'Sandwiches';
    if (/pizza|pasta|spaghetti|lasagna/.test(text)) return 'Italian';
    if (/steak|chicken|fish|salmon|beef|pork/.test(text)) return 'Entrees';
    if (/dessert|cake|pie|ice cream|chocolate/.test(text)) return 'Desserts';
    if (/coffee|tea|soda|juice|beer|wine/.test(text)) return 'Beverages';
    
    return 'Other';
  }

  private estimateServingSize(name: string, description: string): number {
    const text = (name + ' ' + description).toLowerCase();
    
    if (/salad|soup|appetizer/.test(text)) return 1;
    if (/burger|sandwich|entree|main/.test(text)) return 2;
    if (/pizza|pasta|sharing|platter/.test(text)) return 4;
    if (/dessert|side/.test(text)) return 1;
    
    return 2; // Default serving size
  }

  private cleanItemName(name: string): string {
    return name
      .replace(/^\d+\.?\s*/, '') // Remove leading numbers
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim()
      .replace(/^[a-z]/, char => char.toUpperCase()); // Capitalize first letter
  }

  private deduplicateItems(items: MenuItem[]): MenuItem[] {
    const unique: MenuItem[] = [];
    const seen = new Set<string>();
    
    items.forEach(item => {
      const key = `${item.name.toLowerCase()}_${item.price}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });
    
    return unique;
  }

  // Chinese restaurant mode utilities
  private containsChineseCharacters(text: string): boolean {
    return /[\u4e00-\u9fff]/.test(text);
  }

  private validateBilingualName(name: string): {
    hasChineseChars: boolean;
    hasEnglishChars: boolean;
    isWellFormed: boolean;
  } {
    const hasChineseChars = this.containsChineseCharacters(name);
    const hasEnglishChars = /[a-zA-Z]/.test(name);
    const isWellFormed = hasChineseChars || hasEnglishChars;
    
    return {
      hasChineseChars,
      hasEnglishChars,
      isWellFormed
    };
  }

  private getBilingualConsistency(textItems: TextItem[]): number {
    if (!this.chineseRestaurantMode) return 1.0;
    
    const nameItems = textItems.filter(item => 
      item.text.length > 3 && !this.extractNumbers(item.text).length
    );
    
    if (nameItems.length === 0) return 0.0;
    
    const bilingualCount = nameItems.filter(item => {
      const validation = this.validateBilingualName(item.text);
      return validation.hasChineseChars && validation.hasEnglishChars;
    }).length;
    
    return bilingualCount / nameItems.length;
  }

  private parseChineseMenuItemFromRegion(region: MenuRegion, index: number): MenuItem | null {
    const texts = region.items.map(item => item.text);
    
    // Find price
    let price = 0;
    let priceText = '';
    for (const text of texts) {
      const priceMatch = text.match(/\$(\d+\.?\d*)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1]);
        priceText = text;
        break;
      }
    }
    
    if (price === 0) return null;
    
    // Find name (non-price text, prefer bilingual entries)
    const nonPriceTexts = texts.filter(text => text !== priceText && text.length > 2);
    if (nonPriceTexts.length === 0) return null;
    
    // For Chinese mode, prefer bilingual names or Chinese characters
    let name = '';
    for (const text of nonPriceTexts) {
      const validation = this.validateBilingualName(text);
      if (validation.hasChineseChars && validation.hasEnglishChars) {
        name = text; // Bilingual name is preferred
        break;
      } else if (validation.hasChineseChars && !name) {
        name = text; // Chinese-only name as fallback
      } else if (!name) {
        name = text; // Any valid name as last resort
      }
    }
    
    if (!name) {
      name = nonPriceTexts[0]; // Fallback to first available text
    }
    
    const category = this.categorizeItem(name, '');
    
    return {
      id: `chinese-item-${index}`,
      name: this.cleanChineseName(name),
      price,
      description: undefined, // No description in Chinese mode
      category,
      servingSize: this.estimateServingSize(name, ''),
      confidence: region.confidence,
      regionImage: region.regionImage,
      extractionMetadata: {
        sourceRegion: region,
        processingPhase: 'chinese_region_parsing',
        optimizationParameters: this.currentParameters || {},
        chineseRestaurantMode: true
      }
    };
  }

  private cleanChineseName(name: string): string {
    return name
      .replace(/^\d+\.?\s*/, '') // Remove leading numbers
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim();
  }

  // Visual Box Detection for Chinese Restaurant Mode
  private async cachePageCanvas(page: any, pageNum: number): Promise<void> {
    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better detection
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    this.pageCanvasCache.set(pageNum, canvas);
    
    this.log(`Cached canvas for page ${pageNum} (${canvas.width}x${canvas.height})`, 'info', 'box_detection');
  }

  private async detectVisualBoxes(pageData: { textItems: TextItem[], pageNum: number, pageHeight: number }[], params: OptimizationParameters): Promise<void> {
    this.log('Starting visual box detection for Chinese restaurant mode', 'info', 'box_detection');
    
    for (const page of pageData) {
      const canvas = this.pageCanvasCache.get(page.pageNum);
      if (!canvas) continue;
      
      // Detect line-delineated boxes using edge detection
      const lineBoxes = this.detectLineDelineatedBoxes(canvas);
      this.log(`Found ${lineBoxes.length} line-delineated boxes on page ${page.pageNum}`, 'info', 'box_detection');
      
      // Validate regions as menu item boxes
      const menuBoxes = this.validateLineBasedMenuBoxes(lineBoxes, page.textItems, canvas, page.pageHeight);
      this.log(`Validated ${menuBoxes.length} line-based menu boxes on page ${page.pageNum}`, 'info', 'box_detection');
      
      // Extract menu items from validated boxes
      await this.extractMenuItemsFromLineDetectedBoxes(menuBoxes, page, canvas);
    }
  }

  private detectLineDelineatedBoxes(canvas: HTMLCanvasElement): { x: number, y: number, width: number, height: number, confidence: number }[] {
    const context = canvas.getContext('2d')!;
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    this.log('Starting edge-based box detection for line-delineated regions', 'info', 'box_detection');
    
    // Step 1: Edge detection using Sobel operator
    const edges = this.applySobelEdgeDetection(imageData);
    this.log(`Detected ${edges.strongEdges} strong edges`, 'debug', 'box_detection');
    
    // Step 2: Extract horizontal and vertical lines
    const lines = this.extractLines(edges.edgeData, canvas.width, canvas.height);
    this.log(`Extracted ${lines.horizontal.length} horizontal and ${lines.vertical.length} vertical lines`, 'info', 'box_detection');
    
    // Step 3: Form rectangles from line intersections
    const rectangles = this.formRectanglesFromLines(lines.horizontal, lines.vertical, canvas.width, canvas.height);
    this.log(`Formed ${rectangles.length} potential rectangles`, 'info', 'box_detection');
    
    // Step 4: Validate rectangles as menu boxes
    const validBoxes = this.validateLineBasedBoxes(rectangles, canvas.width, canvas.height);
    this.log(`Validated ${validBoxes.length} line-based menu boxes`, 'info', 'box_detection');
    
    return validBoxes;
  }

  private applySobelEdgeDetection(imageData: ImageData): { edgeData: number[], strongEdges: number } {
    const { width, height, data } = imageData;
    const grayscale = new Array(width * height);
    const edgeData = new Array(width * height);
    
    // Convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      grayscale[i / 4] = gray;
    }
    
    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    let strongEdges = 0;
    const edgeThreshold = 30; // Minimum edge strength
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        // Apply Sobel kernels
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIndex = (y + ky) * width + (x + kx);
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            
            gx += grayscale[pixelIndex] * sobelX[kernelIndex];
            gy += grayscale[pixelIndex] * sobelY[kernelIndex];
          }
        }
        
        // Calculate edge magnitude
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const index = y * width + x;
        edgeData[index] = magnitude;
        
        if (magnitude > edgeThreshold) {
          strongEdges++;
        }
      }
    }
    
    return { edgeData, strongEdges };
  }

  private extractLines(edgeData: number[], width: number, height: number): { horizontal: Array<{y: number, x1: number, x2: number, strength: number}>, vertical: Array<{x: number, y1: number, y2: number, strength: number}> } {
    const horizontal: Array<{y: number, x1: number, x2: number, strength: number}> = [];
    const vertical: Array<{x: number, y1: number, y2: number, strength: number}> = [];
    
    const lineThreshold = 25; // Minimum edge strength for line detection
    const minLineLength = 40; // Minimum line length in pixels
    
    // Extract horizontal lines
    for (let y = 0; y < height; y++) {
      let lineStart = -1;
      let lineStrength = 0;
      let strengthSum = 0;
      
      for (let x = 0; x < width; x++) {
        const edgeStrength = edgeData[y * width + x] || 0;
        
        if (edgeStrength > lineThreshold) {
          if (lineStart === -1) {
            lineStart = x;
            strengthSum = edgeStrength;
          } else {
            strengthSum += edgeStrength;
          }
        } else {
          if (lineStart !== -1 && x - lineStart >= minLineLength) {
            horizontal.push({
              y,
              x1: lineStart,
              x2: x - 1,
              strength: strengthSum / (x - lineStart)
            });
          }
          lineStart = -1;
          strengthSum = 0;
        }
      }
      
      // Handle line ending at edge
      if (lineStart !== -1 && width - lineStart >= minLineLength) {
        horizontal.push({
          y,
          x1: lineStart,
          x2: width - 1,
          strength: strengthSum / (width - lineStart)
        });
      }
    }
    
    // Extract vertical lines
    for (let x = 0; x < width; x++) {
      let lineStart = -1;
      let strengthSum = 0;
      
      for (let y = 0; y < height; y++) {
        const edgeStrength = edgeData[y * width + x] || 0;
        
        if (edgeStrength > lineThreshold) {
          if (lineStart === -1) {
            lineStart = y;
            strengthSum = edgeStrength;
          } else {
            strengthSum += edgeStrength;
          }
        } else {
          if (lineStart !== -1 && y - lineStart >= minLineLength) {
            vertical.push({
              x,
              y1: lineStart,
              y2: y - 1,
              strength: strengthSum / (y - lineStart)
            });
          }
          lineStart = -1;
          strengthSum = 0;
        }
      }
      
      // Handle line ending at edge
      if (lineStart !== -1 && height - lineStart >= minLineLength) {
        vertical.push({
          x,
          y1: lineStart,
          y2: height - 1,
          strength: strengthSum / (height - lineStart)
        });
      }
    }
    
    return { horizontal, vertical };
  }

  private formRectanglesFromLines(
    horizontalLines: Array<{y: number, x1: number, x2: number, strength: number}>,
    verticalLines: Array<{x: number, y1: number, y2: number, strength: number}>,
    canvasWidth: number,
    canvasHeight: number
  ): Array<{x: number, y: number, width: number, height: number, confidence: number}> {
    const rectangles: Array<{x: number, y: number, width: number, height: number, confidence: number}> = [];
    const tolerance = 5; // Pixel tolerance for line alignment
    const minBoxWidth = 80;
    const minBoxHeight = 60;
    
    // Sort lines for efficient processing
    const sortedHorizontal = horizontalLines.sort((a, b) => a.y - b.y);
    const sortedVertical = verticalLines.sort((a, b) => a.x - b.x);
    
    // Find rectangles by matching horizontal and vertical line pairs
    for (let i = 0; i < sortedHorizontal.length - 1; i++) {
      const topLine = sortedHorizontal[i];
      
      for (let j = i + 1; j < sortedHorizontal.length; j++) {
        const bottomLine = sortedHorizontal[j];
        
        if (bottomLine.y - topLine.y < minBoxHeight) continue;
        if (bottomLine.y - topLine.y > 300) break; // Max reasonable box height
        
        // Find overlapping X ranges
        const overlapStart = Math.max(topLine.x1, bottomLine.x1);
        const overlapEnd = Math.min(topLine.x2, bottomLine.x2);
        
        if (overlapEnd - overlapStart < minBoxWidth) continue;
        
        // Look for vertical lines that could form the sides
        for (let k = 0; k < sortedVertical.length - 1; k++) {
          const leftLine = sortedVertical[k];
          
          for (let l = k + 1; l < sortedVertical.length; l++) {
            const rightLine = sortedVertical[l];
            
            if (rightLine.x - leftLine.x < minBoxWidth) continue;
            if (rightLine.x - leftLine.x > 400) break; // Max reasonable box width
            
            // Check if vertical lines align with horizontal line boundaries
            const leftInRange = leftLine.x >= overlapStart - tolerance && leftLine.x <= overlapEnd + tolerance;
            const rightInRange = rightLine.x >= overlapStart - tolerance && rightLine.x <= overlapEnd + tolerance;
            
            if (!leftInRange || !rightInRange) continue;
            
            // Check if vertical lines span the horizontal lines
            const leftSpans = leftLine.y1 <= topLine.y + tolerance && leftLine.y2 >= bottomLine.y - tolerance;
            const rightSpans = rightLine.y1 <= topLine.y + tolerance && rightLine.y2 >= bottomLine.y - tolerance;
            
            if (leftSpans && rightSpans) {
              const confidence = (topLine.strength + bottomLine.strength + leftLine.strength + rightLine.strength) / 4 / 100;
              
              rectangles.push({
                x: leftLine.x,
                y: topLine.y,
                width: rightLine.x - leftLine.x,
                height: bottomLine.y - topLine.y,
                confidence: Math.min(1.0, confidence)
              });
            }
          }
        }
      }
    }
    
    return this.mergeOverlappingRectangles(rectangles);
  }

  private mergeOverlappingRectangles(rectangles: Array<{x: number, y: number, width: number, height: number, confidence: number}>): Array<{x: number, y: number, width: number, height: number, confidence: number}> {
    const merged: Array<{x: number, y: number, width: number, height: number, confidence: number}> = [];
    const used = new Set<number>();
    
    for (let i = 0; i < rectangles.length; i++) {
      if (used.has(i)) continue;
      
      let currentRect = rectangles[i];
      used.add(i);
      
      // Check for overlaps with remaining rectangles
      for (let j = i + 1; j < rectangles.length; j++) {
        if (used.has(j)) continue;
        
        const otherRect = rectangles[j];
        const overlapArea = this.calculateRectangleOverlap(currentRect, otherRect);
        const currentArea = currentRect.width * currentRect.height;
        const otherArea = otherRect.width * otherRect.height;
        
        // Merge if overlap is significant (>30% of smaller rectangle)
        if (overlapArea > 0.3 * Math.min(currentArea, otherArea)) {
          const minX = Math.min(currentRect.x, otherRect.x);
          const minY = Math.min(currentRect.y, otherRect.y);
          const maxX = Math.max(currentRect.x + currentRect.width, otherRect.x + otherRect.width);
          const maxY = Math.max(currentRect.y + currentRect.height, otherRect.y + otherRect.height);
          
          currentRect = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            confidence: Math.max(currentRect.confidence, otherRect.confidence)
          };
          used.add(j);
        }
      }
      
      merged.push(currentRect);
    }
    
    return merged;
  }

  private calculateRectangleOverlap(rect1: {x: number, y: number, width: number, height: number}, rect2: {x: number, y: number, width: number, height: number}): number {
    const x1 = Math.max(rect1.x, rect2.x);
    const y1 = Math.max(rect1.y, rect2.y);
    const x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
    const y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
    
    if (x2 <= x1 || y2 <= y1) return 0;
    return (x2 - x1) * (y2 - y1);
  }

  private validateLineBasedBoxes(rectangles: Array<{x: number, y: number, width: number, height: number, confidence: number}>, canvasWidth: number, canvasHeight: number): Array<{x: number, y: number, width: number, height: number, confidence: number}> {
    return rectangles.filter(rect => {
      // Size validation
      if (rect.width < 60 || rect.height < 80) return false;
      if (rect.width > canvasWidth * 0.8 || rect.height > canvasHeight * 0.8) return false;
      
      // Aspect ratio validation (should be roughly rectangular, not too wide or tall)
      const aspectRatio = rect.width / rect.height;
      if (aspectRatio < 0.3 || aspectRatio > 3.0) return false;
      
      // Position validation (not too close to edges)
      if (rect.x < 10 || rect.y < 10) return false;
      if (rect.x + rect.width > canvasWidth - 10 || rect.y + rect.height > canvasHeight - 10) return false;
      
      return true;
    });
  }

  private calculateRegionBrightness(imageData: ImageData, x: number, y: number, width: number, height: number): number {
    const data = imageData.data;
    let totalBrightness = 0;
    let pixelCount = 0;
    
    for (let dy = 0; dy < height && y + dy < imageData.height; dy++) {
      for (let dx = 0; dx < width && x + dx < imageData.width; dx++) {
        const pixelIndex = ((y + dy) * imageData.width + (x + dx)) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;
        pixelCount++;
      }
    }
    
    return pixelCount > 0 ? totalBrightness / pixelCount : 255;
  }

  private expandDarkRegion(imageData: ImageData, startX: number, startY: number, threshold: number, maxWidth: number, maxHeight: number): { x: number, y: number, width: number, height: number } {
    let minX = startX, maxX = startX;
    let minY = startY, maxY = startY;
    
    // Expand horizontally
    while (minX > 0 && this.calculateRegionBrightness(imageData, minX - 10, startY, 10, 10) < threshold) {
      minX -= 10;
    }
    while (maxX < maxWidth - 10 && this.calculateRegionBrightness(imageData, maxX + 10, startY, 10, 10) < threshold) {
      maxX += 10;
    }
    
    // Expand vertically
    while (minY > 0 && this.calculateRegionBrightness(imageData, startX, minY - 10, 10, 10) < threshold) {
      minY -= 10;
    }
    while (maxY < maxHeight - 10 && this.calculateRegionBrightness(imageData, startX, maxY + 10, 10, 10) < threshold) {
      maxY += 10;
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private mergeSimilarRegions(regions: { x: number, y: number, width: number, height: number, contrast: number }[]): { x: number, y: number, width: number, height: number, contrast: number }[] {
    const merged: { x: number, y: number, width: number, height: number, contrast: number }[] = [];
    const used = new Set<number>();
    
    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue;
      
      let currentRegion = regions[i];
      used.add(i);
      
      // Try to merge with other regions
      for (let j = i + 1; j < regions.length; j++) {
        if (used.has(j)) continue;
        
        const otherRegion = regions[j];
        if (this.regionsOverlap(currentRegion, otherRegion, 20)) {
          // Merge regions
          const minX = Math.min(currentRegion.x, otherRegion.x);
          const minY = Math.min(currentRegion.y, otherRegion.y);
          const maxX = Math.max(currentRegion.x + currentRegion.width, otherRegion.x + otherRegion.width);
          const maxY = Math.max(currentRegion.y + currentRegion.height, otherRegion.y + otherRegion.height);
          
          currentRegion = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            contrast: Math.max(currentRegion.contrast, otherRegion.contrast)
          };
          used.add(j);
        }
      }
      
      merged.push(currentRegion);
    }
    
    return merged;
  }

  private regionsOverlap(region1: { x: number, y: number, width: number, height: number }, region2: { x: number, y: number, width: number, height: number }, tolerance: number): boolean {
    return !(region1.x + region1.width + tolerance < region2.x ||
             region2.x + region2.width + tolerance < region1.x ||
             region1.y + region1.height + tolerance < region2.y ||
             region2.y + region2.height + tolerance < region1.y);
  }

  private validateLineBasedMenuBoxes(lineBoxes: { x: number, y: number, width: number, height: number, confidence: number }[], textItems: TextItem[], canvas: HTMLCanvasElement, pageHeight: number): { x: number, y: number, width: number, height: number, confidence: number, layout: 'valid' | 'invalid' }[] {
    const validBoxes: { x: number, y: number, width: number, height: number, confidence: number, layout: 'valid' | 'invalid' }[] = [];
    
    for (const region of lineBoxes) {
      // Convert canvas coordinates to PDF coordinates
      const scale = canvas.height / pageHeight;
      const pdfRegion = {
        x: region.x / scale,
        y: (canvas.height - region.y - region.height) / scale, // Flip Y coordinate
        width: region.width / scale,
        height: region.height / scale
      };
      
      // Find text items within this region with some padding tolerance
      const padding = 5; // Small padding for text that might be close to borders
      const regionText = textItems.filter(item => 
        item.x >= pdfRegion.x - padding &&
        item.x + item.width <= pdfRegion.x + pdfRegion.width + padding &&
        item.y >= pdfRegion.y - padding &&
        item.y + item.height <= pdfRegion.y + pdfRegion.height + padding
      );
      
      // Validate layout: name at top, price at bottom, sparse middle
      const layoutValid = this.validateBoxLayout(regionText, pdfRegion);
      
      if (layoutValid && regionText.length >= 2) {
        validBoxes.push({ ...region, layout: 'valid' });
        this.log(`Valid line-based menu box: ${region.width.toFixed(0)}x${region.height.toFixed(0)} with ${regionText.length} text items`, 'info', 'box_detection');
      } else {
        this.log(`Invalid line-based box: ${regionText.length} text items, layout valid: ${layoutValid}`, 'debug', 'box_detection');
      }
    }
    
    return validBoxes;
  }

  private validateBoxLayout(textItems: TextItem[], region: { x: number, y: number, width: number, height: number }): boolean {
    if (textItems.length < 2) return false;
    
    // Sort items by Y coordinate (top to bottom)
    const sortedItems = textItems.sort((a, b) => b.y - a.y);
    
    // Check for text at top and bottom
    const topThird = region.y + region.height * 0.67;
    const bottomThird = region.y + region.height * 0.33;
    
    const topItems = sortedItems.filter(item => item.y >= topThird);
    const bottomItems = sortedItems.filter(item => item.y <= bottomThird);
    const middleItems = sortedItems.filter(item => item.y > bottomThird && item.y < topThird);
    
    // Validate layout requirements
    const hasTopText = topItems.length > 0;
    const hasBottomPrice = bottomItems.some(item => /\$\d+/.test(item.text));
    const sparseMiddle = middleItems.length <= topItems.length + bottomItems.length;
    
    return hasTopText && hasBottomPrice && sparseMiddle;
  }

  private async extractMenuItemsFromLineDetectedBoxes(menuBoxes: { x: number, y: number, width: number, height: number, confidence: number, layout: 'valid' | 'invalid' }[], page: { textItems: TextItem[], pageNum: number, pageHeight: number }, canvas: HTMLCanvasElement): Promise<void> {
    for (const box of menuBoxes.filter(b => b.layout === 'valid')) {
      // Convert canvas coordinates to PDF coordinates
      const scale = canvas.height / page.pageHeight;
      const pdfRegion = {
        x: box.x / scale,
        y: (canvas.height - box.y - box.height) / scale,
        width: box.width / scale,
        height: box.height / scale
      };
      
      // Extract text items from this box with padding
      const padding = 5;
      const boxText = page.textItems.filter(item => 
        item.x >= pdfRegion.x - padding &&
        item.x + item.width <= pdfRegion.x + pdfRegion.width + padding &&
        item.y >= pdfRegion.y - padding &&
        item.y + item.height <= pdfRegion.y + pdfRegion.height + padding
      );
      
      if (boxText.length >= 2) {
        // Create enhanced region with visual box information
        const enhancedRegion: MenuRegion = {
          items: boxText,
          boundingBox: pdfRegion,
          confidence: 0.85 + box.confidence * 0.15, // High confidence for line-detected boxes
          pageNumber: page.pageNum,
          pageHeight: page.pageHeight
        };
        
        // Extract region image using canvas box coordinates
        try {
          enhancedRegion.regionImage = await this.extractBoxRegionImage(canvas, box);
        } catch (error) {
          this.log(`Failed to extract box region image: ${error}`, 'warn', 'box_detection');
        }
        
        this.detectedRegions.push(enhancedRegion);
        this.log(`Created enhanced region from line-based box: ${boxText.length} items, confidence ${enhancedRegion.confidence.toFixed(3)}`, 'info', 'box_detection');
      }
    }
  }

  private async extractBoxRegionImage(canvas: HTMLCanvasElement, region: { x: number, y: number, width: number, height: number }): Promise<string> {
    const regionCanvas = document.createElement('canvas');
    const regionContext = regionCanvas.getContext('2d')!;
    
    regionCanvas.width = Math.min(region.width, 200);
    regionCanvas.height = Math.min(region.height, 150);
    
    regionContext.drawImage(
      canvas,
      region.x, region.y, region.width, region.height,
      0, 0, regionCanvas.width, regionCanvas.height
    );
    
    return regionCanvas.toDataURL('image/png');
  }
}