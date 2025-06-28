// Core data structures for menu parsing
export interface TextItem {
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

export interface MenuRegion {
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
  regionImage?: string; // Base64 encoded image of the region
}

export interface NumberClassification {
  value: number;
  type: 'price' | 'count' | 'calorie' | 'measurement' | 'item_number' | 'unknown';
  confidence: number;
  reasoning: string;
}

export interface TypographyFingerprint {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  avgLength: number;
  commonPatterns: string[];
  confidence: number;
}

export interface StructuralPattern {
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

// Bayesian optimization interfaces
export interface OptimizationParameters {
  phase0: HeuristicOptimizationParameters;
  phase1: SpatialOptimizationParameters;
  phase2: RegionOptimizationParameters;
  phase3: AssemblyOptimizationParameters;
}

export interface HeuristicOptimizationParameters {
  priceClassificationThreshold: number;
  typographyConsistencyWeight: number;
  economicClusteringTolerance: number;
  patternExtractionMinSupport: number;
  numberClassificationConfidence: number;
}

export interface SpatialOptimizationParameters {
  yProximityThreshold: number;
  xDistanceThreshold: number;
  confidenceWeights: {
    textLengthVariety: number;
    pricePattern: number;
    itemCount: number;
    typography: number;
  };
  minimumConfidenceThreshold: number;
}

export interface RegionOptimizationParameters {
  dimensionalConstraints: {
    minWidthEm: number;
    minHeightEm: number;
  };
  heuristicValidationWeights: {
    nameLength: number;
    descriptionComplexity: number;
    priceValidation: number;
  };
  extractionQualityThreshold: number;
  confidenceFilteringThreshold: number;
  regionMergingTolerance: number;
}

export interface AssemblyOptimizationParameters {
  bootstrapQualityThreshold: number;
  convergenceThreshold: number;
  maxBootstrapIterations: number;
  deduplicationSimilarityThreshold: number;
  documentValidationWeights: {
    uniqueness: number;
    priceDistribution: number;
    categoryConsistency: number;
  };
  tripleParsingWeights: {
    nameValidation: number;
    descriptionValidation: number;
    priceValidation: number;
  };
}

export interface OptimizationResult {
  parameters: OptimizationParameters;
  performance: number;
  convergenceMetrics: {
    iterations: number;
    finalImprovement: number;
    parameterStability: number;
  };
  objectiveBreakdown: {
    accuracy: number;
    speed: number;
    confidence: number;
    memoryEfficiency: number;
  };
}

export interface ProcessingMetrics {
  processingTime: number;
  memoryUsage: number;
  regionsDetected: number;
  itemsExtracted: number;
  averageConfidence: number;
  optimizationIterations: number;
}

// Menu item interfaces
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category: string;
  servingSize?: number;
  regionImage?: string;
  confidence?: number;
  extractionMetadata?: {
    sourceRegion: MenuRegion;
    processingPhase: string;
    optimizationParameters: Partial<OptimizationParameters>;
  };
}

export interface CateringOrder {
  guestCount: number;
  items: OrderItem[];
  totalCost: number;
  processingMetrics?: ProcessingMetrics;
  optimizationResult?: OptimizationResult;
}

export interface OrderItem extends MenuItem {
  quantity: number;
  totalPrice: number;
}

// Processing state interfaces
export interface ProcessingState {
  phase: string;
  progress: number;
  message: string;
  optimizationIteration?: number;
  currentParameters?: Partial<OptimizationParameters>;
  metrics?: Partial<ProcessingMetrics>;
}

export interface LogEntry {
  timestamp: number;
  phase: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}