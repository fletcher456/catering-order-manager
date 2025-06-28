# Adaptive Bayesian Optimization Engine Documentation

## Overview

The Adaptive Bayesian Optimization Engine serves as the intelligent parameter tuning system for the entire menu parsing pipeline. It replaces manual parameter selection with data-driven optimization that automatically discovers optimal configurations for accuracy, speed, and confidence across all processing phases.

## Core Architecture

### Gaussian Process Surrogate Model

**Purpose**: Build probabilistic models of parameter performance relationships

#### Model Configuration

**Kernel Selection**:
```typescript
interface KernelConfiguration {
  kernelType: 'rbf' | 'matern32' | 'matern52';
  lengthScale: number[];        // One per parameter dimension
  outputVariance: number;       // Signal variance
  noiseVariance: number;        // Observation noise
  automaticRelevanceDetermination: boolean; // ARD for parameter importance
}

class GaussianProcessModel {
  private kernel: KernelFunction;
  private observations: { parameters: number[], performance: number }[] = [];
  
  constructor(config: KernelConfiguration) {
    this.kernel = this.createKernel(config);
  }
  
  private createKernel(config: KernelConfiguration): KernelFunction {
    switch (config.kernelType) {
      case 'rbf':
        return new RBFKernel(config.lengthScale, config.outputVariance);
      case 'matern32':
        return new Matern32Kernel(config.lengthScale, config.outputVariance);
      case 'matern52':
        return new Matern52Kernel(config.lengthScale, config.outputVariance);
    }
  }
  
  predict(testPoints: number[][]): PredictionResult {
    const means = this.computePosteriorMeans(testPoints);
    const variances = this.computePosteriorVariances(testPoints);
    
    return {
      means,
      variances,
      standardDeviations: variances.map(v => Math.sqrt(v)),
      confidenceIntervals: this.computeConfidenceIntervals(means, variances)
    };
  }
}
```

#### Hyperparameter Learning

**Marginal Likelihood Optimization**:
```typescript
interface HyperparameterOptimization {
  method: 'gradient_descent' | 'adam' | 'lbfgs';
  maxIterations: 100;
  convergenceThreshold: 1e-6;
  learningRate: 0.01;
  regularization: number;
}

private optimizeHyperparameters(): void {
  const objectiveFunction = (hyperparams: number[]) => {
    this.updateKernelHyperparameters(hyperparams);
    return -this.computeLogMarginalLikelihood();
  };
  
  const optimizedParams = this.optimizer.minimize(
    objectiveFunction,
    this.getCurrentHyperparameters(),
    this.config.hyperparameterOptimization
  );
  
  this.updateKernelHyperparameters(optimizedParams);
}
```

### Acquisition Function Framework

**Purpose**: Balance exploration of uncertain regions with exploitation of promising areas

#### Expected Improvement Implementation

```typescript
class ExpectedImprovementAcquisition {
  private bestObservedValue: number;
  private explorationWeight: number; // Temperature-like parameter
  
  constructor(observations: Observation[], explorationWeight: number) {
    this.bestObservedValue = Math.max(...observations.map(obs => obs.performance));
    this.explorationWeight = explorationWeight;
  }
  
  evaluate(candidatePoints: number[][], predictions: PredictionResult): number[] {
    return candidatePoints.map((point, index) => {
      const mean = predictions.means[index];
      const stdDev = predictions.standardDeviations[index];
      
      if (stdDev === 0) return 0;
      
      // Improvement with exploration weight adjustment
      const improvement = mean - this.bestObservedValue - this.explorationWeight;
      const z = improvement / stdDev;
      
      // Expected improvement calculation
      const phi = this.normalCDF(z);
      const pdf = this.normalPDF(z);
      
      return improvement * phi + stdDev * pdf;
    });
  }
  
  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }
  
  private normalPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }
}
```

#### Upper Confidence Bound Alternative

```typescript
class UpperConfidenceBoundAcquisition {
  private explorationWeight: number;
  
  evaluate(candidatePoints: number[][], predictions: PredictionResult): number[] {
    return candidatePoints.map((point, index) => {
      const mean = predictions.means[index];
      const stdDev = predictions.standardDeviations[index];
      
      // UCB = mean + β * standard_deviation
      return mean + this.explorationWeight * stdDev;
    });
  }
}
```

### Exploration Weight Scheduling

**Purpose**: Provide temperature-like control over exploration vs exploitation trade-offs

#### Adaptive Cooling Schedules

```typescript
interface CoolingScheduleConfig {
  schedule: 'exponential' | 'linear' | 'cosine' | 'polynomial';
  initialWeight: 2.0;           // High exploration
  finalWeight: 0.1;             // Low exploration  
  decayRate?: number;           // For exponential
  power?: number;               // For polynomial
}

class ExplorationWeightScheduler {
  private config: CoolingScheduleConfig;
  private currentIteration: number = 0;
  private maxIterations: number;
  
  constructor(config: CoolingScheduleConfig, maxIterations: number) {
    this.config = config;
    this.maxIterations = maxIterations;
  }
  
  getCurrentWeight(): number {
    const progress = this.currentIteration / this.maxIterations;
    const initial = this.config.initialWeight;
    const final = this.config.finalWeight;
    
    switch (this.config.schedule) {
      case 'exponential':
        return initial * Math.pow(final / initial, progress);
      
      case 'linear':
        return initial - progress * (initial - final);
      
      case 'cosine':
        return final + 0.5 * (initial - final) * (1 + Math.cos(Math.PI * progress));
      
      case 'polynomial':
        const power = this.config.power || 2;
        return initial - (initial - final) * Math.pow(progress, power);
      
      default:
        return initial - progress * (initial - final);
    }
  }
  
  step(): void {
    this.currentIteration++;
  }
  
  reset(): void {
    this.currentIteration = 0;
  }
}
```

### Parameter Space Definition

**Purpose**: Define optimization boundaries and constraints for all pipeline phases

#### Multi-Phase Parameter Configuration

```typescript
interface ParameterSpaceDefinition {
  phase0: HeuristicParameters;
  phase1: SpatialClusteringParameters;
  phase2: RegionValidationParameters;
  phase3: MenuAssemblyParameters;
  constraints: ParameterConstraints;
  objectives: ObjectiveWeights;
}

interface HeuristicParameters {
  priceClassificationThreshold: { min: 0.5, max: 0.95 };
  typographyConsistencyWeight: { min: 0.1, max: 0.9 };
  economicClusteringTolerance: { min: 0.1, max: 0.5 };
  patternExtractionMinSupport: { min: 0.2, max: 0.8 };
}

interface SpatialClusteringParameters {
  yProximityThreshold: { min: 0.8, max: 3.0 };    // em units
  xDistanceThreshold: { min: 3.0, max: 10.0 };    // em units
  confidenceWeights: {
    textLengthVariety: { min: 0.1, max: 0.4 };
    pricePattern: { min: 0.2, max: 0.5 };
    itemCount: { min: 0.1, max: 0.3 };
    typography: { min: 0.05, max: 0.2 };
  };
  minimumConfidenceThreshold: { min: 0.4, max: 0.8 };
}

interface RegionValidationParameters {
  dimensionalConstraints: {
    minWidthEm: { min: 1.5, max: 5.0 };
    minHeightEm: { min: 0.5, max: 2.0 };
  };
  heuristicValidationWeights: {
    nameLength: { min: 0.15, max: 0.35 };
    descriptionComplexity: { min: 0.15, max: 0.35 };
    priceValidation: { min: 0.25, max: 0.45 };
  };
  extractionQualityThreshold: { min: 0.5, max: 0.9 };
}

interface MenuAssemblyParameters {
  bootstrapQualityThreshold: { min: 0.6, max: 0.85 };
  convergenceThreshold: { min: 0.01, max: 0.1 };
  maxBootstrapIterations: { min: 1, max: 5 };
  deduplicationSimilarityThreshold: { min: 0.7, max: 0.95 };
  documentValidationWeights: {
    uniqueness: { min: 0.2, max: 0.4 };
    priceDistribution: { min: 0.3, max: 0.5 };
    categoryConsistency: { min: 0.2, max: 0.4 };
  };
}
```

#### Constraint Management

```typescript
interface ParameterConstraints {
  linearConstraints: LinearConstraint[];
  boundConstraints: BoundConstraint[];
  customConstraints: CustomConstraint[];
}

interface LinearConstraint {
  coefficients: number[];
  operator: 'eq' | 'le' | 'ge';
  bound: number;
  description: string;
}

class ConstraintValidator {
  validateParameters(parameters: number[]): ValidationResult {
    const violations: string[] = [];
    
    // Check bound constraints
    for (const constraint of this.config.boundConstraints) {
      if (!this.checkBoundConstraint(parameters, constraint)) {
        violations.push(constraint.description);
      }
    }
    
    // Check linear constraints
    for (const constraint of this.config.linearConstraints) {
      if (!this.checkLinearConstraint(parameters, constraint)) {
        violations.push(constraint.description);
      }
    }
    
    return {
      isValid: violations.length === 0,
      violations,
      adjustedParameters: this.projectToFeasibleRegion(parameters)
    };
  }
}
```

## Optimization Workflow

### Multi-Objective Optimization

**Purpose**: Balance competing objectives (accuracy, speed, memory, confidence)

#### Objective Function Design

```typescript
interface MultiObjectiveConfiguration {
  objectives: ObjectiveFunction[];
  weights: number[];
  scalarizationMethod: 'weighted_sum' | 'tchebycheff' | 'achievement';
  referencePoint?: number[];
}

class MultiObjectiveOptimizer {
  private objectives: ObjectiveFunction[];
  private weights: number[];
  
  async evaluateParameters(parameters: number[]): Promise<ObjectiveEvaluation> {
    // Run complete parsing pipeline with given parameters
    const pipelineResult = await this.runOptimizedPipeline(parameters);
    
    const objectiveValues = {
      accuracy: this.calculateAccuracy(pipelineResult),
      speed: this.calculateSpeed(pipelineResult),
      confidence: this.calculateAverageConfidence(pipelineResult),
      memoryEfficiency: this.calculateMemoryEfficiency(pipelineResult)
    };
    
    // Scalarize multiple objectives
    const scalarizedValue = this.scalarizeObjectives(objectiveValues);
    
    return {
      scalarValue: scalarizedValue,
      objectiveValues,
      constraints: this.evaluateConstraints(parameters),
      metadata: {
        evaluationTime: pipelineResult.processingTime,
        itemsExtracted: pipelineResult.menuItems.length,
        convergenceMetrics: pipelineResult.convergenceData
      }
    };
  }
  
  private scalarizeObjectives(objectives: ObjectiveValues): number {
    switch (this.config.scalarizationMethod) {
      case 'weighted_sum':
        return this.weights.reduce((sum, weight, index) => 
          sum + weight * Object.values(objectives)[index], 0
        );
      
      case 'tchebycheff':
        const deviations = Object.values(objectives).map((value, index) => 
          this.weights[index] * Math.abs(value - this.config.referencePoint![index])
        );
        return Math.max(...deviations);
      
      default:
        return this.weights.reduce((sum, weight, index) => 
          sum + weight * Object.values(objectives)[index], 0
        );
    }
  }
}
```

### Convergence Detection

**Purpose**: Automatically detect when optimization has reached sufficient quality

#### Multi-Criteria Convergence

```typescript
interface ConvergenceConfiguration {
  maxIterations: 50;
  qualityImprovementThreshold: 0.01;
  parameterStabilityWindow: 5;
  objectiveStabilityThreshold: 0.005;
  minIterationsBeforeConvergence: 10;
}

class ConvergenceDetector {
  private evaluationHistory: ObjectiveEvaluation[] = [];
  private parameterHistory: number[][] = [];
  
  checkConvergence(): ConvergenceResult {
    if (this.evaluationHistory.length < this.config.minIterationsBeforeConvergence) {
      return { hasConverged: false, reason: 'insufficient_iterations' };
    }
    
    // Check quality improvement
    const recentImprovement = this.calculateRecentImprovement();
    if (recentImprovement < this.config.qualityImprovementThreshold) {
      return { 
        hasConverged: true, 
        reason: 'quality_plateau',
        metrics: this.getConvergenceMetrics()
      };
    }
    
    // Check parameter stability
    const parameterStability = this.calculateParameterStability();
    if (parameterStability < this.config.objectiveStabilityThreshold) {
      return { 
        hasConverged: true, 
        reason: 'parameter_stability',
        metrics: this.getConvergenceMetrics()
      };
    }
    
    // Check maximum iterations
    if (this.evaluationHistory.length >= this.config.maxIterations) {
      return { 
        hasConverged: true, 
        reason: 'max_iterations',
        metrics: this.getConvergenceMetrics()
      };
    }
    
    return { hasConverged: false, reason: 'continuing_optimization' };
  }
  
  private calculateRecentImprovement(): number {
    const windowSize = Math.min(5, Math.floor(this.evaluationHistory.length / 2));
    const recentEvaluations = this.evaluationHistory.slice(-windowSize);
    const earlierEvaluations = this.evaluationHistory.slice(-2 * windowSize, -windowSize);
    
    const recentMean = recentEvaluations.reduce((sum, eval) => sum + eval.scalarValue, 0) / recentEvaluations.length;
    const earlierMean = earlierEvaluations.reduce((sum, eval) => sum + eval.scalarValue, 0) / earlierEvaluations.length;
    
    return Math.abs(recentMean - earlierMean);
  }
}
```

## Performance Monitoring

### Real-Time Optimization Tracking

```typescript
interface OptimizationMetrics {
  currentIteration: number;
  bestObjectiveValue: number;
  currentExplorationWeight: number;
  parameterConvergence: number;
  expectedImprovement: number;
  evaluationEfficiency: number;
  timeRemaining: number;
}

class OptimizationMonitor {
  private startTime: number;
  private iterationTimes: number[] = [];
  
  getOptimizationMetrics(): OptimizationMetrics {
    return {
      currentIteration: this.optimizer.getCurrentIteration(),
      bestObjectiveValue: this.getBestObjectiveValue(),
      currentExplorationWeight: this.scheduler.getCurrentWeight(),
      parameterConvergence: this.calculateParameterConvergence(),
      expectedImprovement: this.calculateExpectedImprovement(),
      evaluationEfficiency: this.calculateEvaluationEfficiency(),
      timeRemaining: this.estimateTimeRemaining()
    };
  }
  
  private estimateTimeRemaining(): number {
    if (this.iterationTimes.length < 3) return -1;
    
    const avgIterationTime = this.iterationTimes.reduce((sum, time) => sum + time, 0) / this.iterationTimes.length;
    const remainingIterations = this.config.maxIterations - this.optimizer.getCurrentIteration();
    
    return avgIterationTime * remainingIterations;
  }
}
```

## Integration with Pipeline Phases

### Phase-Specific Parameter Application

```typescript
class OptimizedPipelineExecutor {
  private currentParameters: OptimalParameters;
  
  async executeOptimizedPipeline(file: File): Promise<OptimizedPipelineResult> {
    // Phase 0: Heuristic Analysis with optimized parameters
    const heuristicResults = await this.executeHeuristicAnalysis(
      file, 
      this.currentParameters.phase0
    );
    
    // Phase 1: Spatial Clustering with optimized parameters
    const spatialResults = await this.executeSpatialClustering(
      heuristicResults,
      this.currentParameters.phase1
    );
    
    // Phase 2: Region Validation with optimized parameters
    const validationResults = await this.executeRegionValidation(
      spatialResults,
      this.currentParameters.phase2
    );
    
    // Phase 3: Menu Assembly with optimized parameters
    const assemblyResults = await this.executeMenuAssembly(
      validationResults,
      this.currentParameters.phase3
    );
    
    return {
      menuItems: assemblyResults.menuItems,
      processingMetrics: this.aggregateMetrics(),
      optimizationMetadata: this.getOptimizationContext()
    };
  }
}
```

## Browser Implementation Considerations

### Memory-Efficient Gaussian Processes

```typescript
class BrowserOptimizedGP {
  private maxObservations: number = 100; // Limit for browser memory
  
  addObservation(parameters: number[], performance: number): void {
    this.observations.push({ parameters, performance });
    
    // Implement observation pruning for memory management
    if (this.observations.length > this.maxObservations) {
      this.pruneObservations();
    }
  }
  
  private pruneObservations(): void {
    // Keep best observations and diverse parameter points
    const sorted = this.observations.sort((a, b) => b.performance - a.performance);
    const keepBest = sorted.slice(0, Math.floor(this.maxObservations * 0.7));
    
    // Add diverse points for exploration
    const remaining = sorted.slice(Math.floor(this.maxObservations * 0.7));
    const diverse = this.selectDiversePoints(remaining, Math.floor(this.maxObservations * 0.3));
    
    this.observations = [...keepBest, ...diverse];
  }
}
```

### Progressive Enhancement

```typescript
interface OptimizationMode {
  mode: 'fast' | 'accurate' | 'balanced' | 'research';
  maxEvaluations: number;
  convergenceThreshold: number;
  explorationStrategy: 'conservative' | 'aggressive';
}

class AdaptiveOptimizationManager {
  selectOptimizationStrategy(fileSize: number, userPreferences: UserPreferences): OptimizationMode {
    if (fileSize > 10_000_000) { // Large files
      return {
        mode: 'fast',
        maxEvaluations: 15,
        convergenceThreshold: 0.05,
        explorationStrategy: 'conservative'
      };
    }
    
    if (userPreferences.prioritizeAccuracy) {
      return {
        mode: 'accurate',
        maxEvaluations: 50,
        convergenceThreshold: 0.01,
        explorationStrategy: 'aggressive'
      };
    }
    
    return {
      mode: 'balanced',
      maxEvaluations: 30,
      convergenceThreshold: 0.02,
      explorationStrategy: 'conservative'
    };
  }
}
```

The Adaptive Bayesian Optimization Engine provides intelligent, automatic parameter tuning that significantly improves menu parsing performance while maintaining the conceptual simplicity of temperature-based control through exploration weight scheduling.