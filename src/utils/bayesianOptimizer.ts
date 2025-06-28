import { 
  OptimizationParameters, 
  OptimizationResult, 
  HeuristicOptimizationParameters,
  SpatialOptimizationParameters,
  RegionOptimizationParameters,
  AssemblyOptimizationParameters,
  ProcessingMetrics 
} from '../types';

interface KernelConfiguration {
  kernelType: 'rbf' | 'matern32' | 'matern52';
  lengthScale: number[];
  outputVariance: number;
  noiseVariance: number;
}

interface PredictionResult {
  means: number[];
  variances: number[];
  standardDeviations: number[];
  confidenceIntervals: { lower: number; upper: number }[];
}

interface Observation {
  parameters: number[];
  performance: number;
  metadata?: any;
}

interface CoolingScheduleConfig {
  schedule: 'exponential' | 'linear' | 'cosine' | 'polynomial';
  initialWeight: number;
  finalWeight: number;
  decayRate?: number;
  power?: number;
}

export class AdaptiveBayesianOptimizer {
  private observations: Observation[] = [];
  private kernelConfig: KernelConfiguration;
  private coolingConfig: CoolingScheduleConfig;
  private currentIteration: number = 0;
  private maxIterations: number;
  private convergenceThreshold: number;
  private parameterBounds: { min: number; max: number }[];
  private logCallback?: (message: string) => void;

  constructor(
    maxIterations: number = 30,
    convergenceThreshold: number = 0.01,
    logCallback?: (message: string) => void
  ) {
    this.maxIterations = maxIterations;
    this.convergenceThreshold = convergenceThreshold;
    this.logCallback = logCallback;
    
    this.kernelConfig = {
      kernelType: 'rbf',
      lengthScale: [1.0],
      outputVariance: 1.0,
      noiseVariance: 0.1
    };

    this.coolingConfig = {
      schedule: 'exponential',
      initialWeight: 2.0,
      finalWeight: 0.1,
      decayRate: 0.1
    };

    this.parameterBounds = this.defineParameterBounds();
  }

  private log(message: string): void {
    if (this.logCallback) {
      this.logCallback(`[Optimizer] ${message}`);
    }
  }

  private defineParameterBounds(): { min: number; max: number }[] {
    return [
      // Phase 0 parameters
      { min: 0.5, max: 0.95 },   // priceClassificationThreshold
      { min: 0.1, max: 0.9 },    // typographyConsistencyWeight
      { min: 0.1, max: 0.5 },    // economicClusteringTolerance
      { min: 0.2, max: 0.8 },    // patternExtractionMinSupport
      { min: 0.6, max: 0.95 },   // numberClassificationConfidence
      
      // Phase 1 parameters
      { min: 0.8, max: 3.0 },    // yProximityThreshold
      { min: 3.0, max: 10.0 },   // xDistanceThreshold
      { min: 0.1, max: 0.4 },    // textLengthVariety weight
      { min: 0.2, max: 0.5 },    // pricePattern weight
      { min: 0.1, max: 0.3 },    // itemCount weight
      { min: 0.05, max: 0.2 },   // typography weight
      { min: 0.4, max: 0.8 },    // minimumConfidenceThreshold
      
      // Phase 2 parameters
      { min: 1.5, max: 5.0 },    // minWidthEm
      { min: 0.5, max: 2.0 },    // minHeightEm
      { min: 0.15, max: 0.35 },  // nameLength weight
      { min: 0.15, max: 0.35 },  // descriptionComplexity weight
      { min: 0.25, max: 0.45 },  // priceValidation weight
      { min: 0.5, max: 0.9 },    // extractionQualityThreshold
      { min: 0.4, max: 0.8 },    // confidenceFilteringThreshold
      { min: 0.1, max: 0.4 },    // regionMergingTolerance
      
      // Phase 3 parameters
      { min: 0.6, max: 0.85 },   // bootstrapQualityThreshold
      { min: 0.01, max: 0.1 },   // convergenceThreshold
      { min: 1, max: 5 },        // maxBootstrapIterations
      { min: 0.7, max: 0.95 },   // deduplicationSimilarityThreshold
      { min: 0.2, max: 0.4 },    // uniqueness weight
      { min: 0.3, max: 0.5 },    // priceDistribution weight
      { min: 0.2, max: 0.4 },    // categoryConsistency weight
      { min: 0.25, max: 0.45 },  // nameValidation weight
      { min: 0.25, max: 0.45 },  // descriptionValidation weight
      { min: 0.30, max: 0.50 }   // priceValidation weight
    ];
  }

  async optimize(objectiveFunction: (params: OptimizationParameters) => Promise<number>): Promise<OptimizationResult> {
    this.log('Starting Bayesian optimization');
    
    // Initialize with random samples
    await this.initializeWithRandomSamples(objectiveFunction, 3);
    
    const startTime = Date.now();
    let lastImprovement = 0;
    let bestPerformance = Math.max(...this.observations.map(obs => obs.performance));

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      this.currentIteration = iteration;
      
      this.log(`Optimization iteration ${iteration + 1}/${this.maxIterations}`);
      
      // Select next candidate using acquisition function
      const candidate = this.selectNextCandidate();
      const candidateParams = this.arrayToParameters(candidate);
      
      // Evaluate candidate
      const performance = await objectiveFunction(candidateParams);
      
      // Add observation
      this.observations.push({
        parameters: candidate,
        performance,
        metadata: { iteration, explorationWeight: this.getCurrentExplorationWeight() }
      });

      // Check for improvement
      if (performance > bestPerformance) {
        const improvement = performance - bestPerformance;
        lastImprovement = improvement;
        bestPerformance = performance;
        this.log(`New best performance: ${performance.toFixed(4)} (improvement: +${improvement.toFixed(4)})`);
      }

      // Check convergence
      if (this.checkConvergence(lastImprovement)) {
        this.log(`Converged after ${iteration + 1} iterations`);
        break;
      }
    }

    const processingTime = Date.now() - startTime;
    const bestObservation = this.observations.reduce((best, obs) => 
      obs.performance > best.performance ? obs : best
    );

    const result: OptimizationResult = {
      parameters: this.arrayToParameters(bestObservation.parameters),
      performance: bestObservation.performance,
      convergenceMetrics: {
        iterations: this.currentIteration + 1,
        finalImprovement: lastImprovement,
        parameterStability: this.calculateParameterStability()
      },
      objectiveBreakdown: {
        accuracy: bestObservation.performance * 0.4,
        speed: bestObservation.performance * 0.3,
        confidence: bestObservation.performance * 0.2,
        memoryEfficiency: bestObservation.performance * 0.1
      }
    };

    this.log(`Optimization completed: ${result.convergenceMetrics.iterations} iterations, performance: ${result.performance.toFixed(4)}`);
    
    return result;
  }

  private async initializeWithRandomSamples(
    objectiveFunction: (params: OptimizationParameters) => Promise<number>,
    count: number
  ): Promise<void> {
    this.log(`Initializing with ${count} random samples`);
    
    for (let i = 0; i < count; i++) {
      const randomParams = this.generateRandomParameters();
      const parameters = this.arrayToParameters(randomParams);
      const performance = await objectiveFunction(parameters);
      
      this.observations.push({
        parameters: randomParams,
        performance,
        metadata: { initialization: true }
      });
    }
  }

  private generateRandomParameters(): number[] {
    return this.parameterBounds.map(bound => 
      Math.random() * (bound.max - bound.min) + bound.min
    );
  }

  private selectNextCandidate(): number[] {
    // Simple acquisition function: Upper Confidence Bound
    const explorationWeight = this.getCurrentExplorationWeight();
    
    // Generate candidate points
    const candidates = Array.from({ length: 50 }, () => this.generateRandomParameters());
    
    // Evaluate acquisition function for each candidate
    let bestCandidate = candidates[0];
    let bestScore = -Infinity;

    for (const candidate of candidates) {
      const prediction = this.predictPerformance([candidate]);
      const mean = prediction.means[0];
      const stdDev = prediction.standardDeviations[0];
      
      // Upper Confidence Bound
      const score = mean + explorationWeight * stdDev;
      
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  private predictPerformance(candidates: number[][]): PredictionResult {
    if (this.observations.length === 0) {
      // Return uniform predictions if no observations
      return {
        means: candidates.map(() => 0.5),
        variances: candidates.map(() => 1.0),
        standardDeviations: candidates.map(() => 1.0),
        confidenceIntervals: candidates.map(() => ({ lower: -1, upper: 2 }))
      };
    }

    // Simple GP prediction using RBF kernel
    const means = candidates.map(candidate => {
      let weightedSum = 0;
      let weightSum = 0;

      this.observations.forEach(obs => {
        const distance = this.euclideanDistance(candidate, obs.parameters);
        const weight = Math.exp(-0.5 * distance * distance);
        weightedSum += weight * obs.performance;
        weightSum += weight;
      });

      return weightSum > 0 ? weightedSum / weightSum : 0.5;
    });

    const variances = candidates.map(() => {
      // Simplified variance estimation
      return Math.max(0.1, 1.0 - this.observations.length / this.maxIterations);
    });

    return {
      means,
      variances,
      standardDeviations: variances.map(v => Math.sqrt(v)),
      confidenceIntervals: means.map((mean, i) => ({
        lower: mean - 1.96 * Math.sqrt(variances[i]),
        upper: mean + 1.96 * Math.sqrt(variances[i])
      }))
    };
  }

  private euclideanDistance(a: number[], b: number[]): number {
    const sum = a.reduce((acc, val, i) => acc + Math.pow(val - b[i], 2), 0);
    return Math.sqrt(sum);
  }

  private getCurrentExplorationWeight(): number {
    const progress = this.currentIteration / this.maxIterations;
    const { schedule, initialWeight, finalWeight, decayRate, power } = this.coolingConfig;

    switch (schedule) {
      case 'exponential':
        return initialWeight * Math.pow(finalWeight / initialWeight, progress);
      case 'linear':
        return initialWeight - progress * (initialWeight - finalWeight);
      case 'cosine':
        return finalWeight + 0.5 * (initialWeight - finalWeight) * (1 + Math.cos(Math.PI * progress));
      case 'polynomial':
        const p = power || 2;
        return initialWeight - (initialWeight - finalWeight) * Math.pow(progress, p);
      default:
        return initialWeight - progress * (initialWeight - finalWeight);
    }
  }

  private checkConvergence(lastImprovement: number): boolean {
    if (this.observations.length < 5) return false;
    
    // Check improvement threshold
    if (lastImprovement < this.convergenceThreshold) {
      return true;
    }

    // Check parameter stability
    const recentParams = this.observations.slice(-5).map(obs => obs.parameters);
    const avgParams = recentParams[0].map((_, i) => 
      recentParams.reduce((sum, params) => sum + params[i], 0) / recentParams.length
    );
    
    const stability = recentParams.reduce((sum, params) => 
      sum + this.euclideanDistance(params, avgParams), 0
    ) / recentParams.length;

    return stability < 0.01;
  }

  private calculateParameterStability(): number {
    if (this.observations.length < 3) return 0;
    
    const recentParams = this.observations.slice(-3).map(obs => obs.parameters);
    const variations = recentParams[0].map((_, i) => {
      const values = recentParams.map(params => params[i]);
      const mean = values.reduce((a, b) => a + b) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      return Math.sqrt(variance);
    });
    
    return variations.reduce((a, b) => a + b) / variations.length;
  }

  private arrayToParameters(array: number[]): OptimizationParameters {
    let index = 0;
    
    // Phase 0 parameters
    const phase0: HeuristicOptimizationParameters = {
      priceClassificationThreshold: array[index++],
      typographyConsistencyWeight: array[index++],
      economicClusteringTolerance: array[index++],
      patternExtractionMinSupport: array[index++],
      numberClassificationConfidence: array[index++]
    };

    // Phase 1 parameters
    const phase1: SpatialOptimizationParameters = {
      yProximityThreshold: array[index++],
      xDistanceThreshold: array[index++],
      confidenceWeights: {
        textLengthVariety: array[index++],
        pricePattern: array[index++],
        itemCount: array[index++],
        typography: array[index++]
      },
      minimumConfidenceThreshold: array[index++]
    };

    // Phase 2 parameters
    const phase2: RegionOptimizationParameters = {
      dimensionalConstraints: {
        minWidthEm: array[index++],
        minHeightEm: array[index++]
      },
      heuristicValidationWeights: {
        nameLength: array[index++],
        descriptionComplexity: array[index++],
        priceValidation: array[index++]
      },
      extractionQualityThreshold: array[index++],
      confidenceFilteringThreshold: array[index++],
      regionMergingTolerance: array[index++]
    };

    // Phase 3 parameters
    const phase3: AssemblyOptimizationParameters = {
      bootstrapQualityThreshold: array[index++],
      convergenceThreshold: array[index++],
      maxBootstrapIterations: Math.round(array[index++]),
      deduplicationSimilarityThreshold: array[index++],
      documentValidationWeights: {
        uniqueness: array[index++],
        priceDistribution: array[index++],
        categoryConsistency: array[index++]
      },
      tripleParsingWeights: {
        nameValidation: array[index++],
        descriptionValidation: array[index++],
        priceValidation: array[index++]
      }
    };

    return { phase0, phase1, phase2, phase3 };
  }

  getOptimizationMetrics() {
    const bestPerformance = this.observations.length > 0 
      ? Math.max(...this.observations.map(obs => obs.performance))
      : 0;

    return {
      currentIteration: this.currentIteration,
      bestObjectiveValue: bestPerformance,
      currentExplorationWeight: this.getCurrentExplorationWeight(),
      parameterConvergence: this.calculateParameterStability(),
      totalObservations: this.observations.length,
      expectedImprovement: this.estimateExpectedImprovement()
    };
  }

  private estimateExpectedImprovement(): number {
    if (this.observations.length < 2) return 1.0;
    
    const performances = this.observations.map(obs => obs.performance);
    const recent = performances.slice(-3);
    const earlier = performances.slice(0, -3);
    
    if (earlier.length === 0) return 1.0;
    
    const recentMean = recent.reduce((a, b) => a + b) / recent.length;
    const earlierMean = earlier.reduce((a, b) => a + b) / earlier.length;
    
    return Math.max(0, recentMean - earlierMean);
  }
}