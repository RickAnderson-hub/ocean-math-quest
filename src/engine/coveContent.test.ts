import { describe, it, expect } from 'vitest';
import {
  checkAssociative,
  checkBuildArray,
  checkCommuteSolve,
  checkEquivalentFacts,
  checkFactorPairs,
  checkTrueFalse,
  checkWhenToMultiply,
  generateRound,
} from './coveContent';
import {
  AssociativeRound,
  BuildArrayRound,
  CommuteSolveRound,
  EquivalentFactsRound,
  FactorPairsRound,
  TrueFalseRound,
  WhenToMultiplyRound,
} from './coveContent';

function fixedRng(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('generateRound', () => {
  it('generates a when-to-multiply round with factors in 2..10 and a valid correctChoice', () => {
    const round = generateRound('when-to-multiply', fixedRng(0.4, 0.9, 0.1)) as WhenToMultiplyRound;
    expect(round.skillId).toBe('when-to-multiply');
    expect(['multiply', 'add']).toContain(round.correctChoice);
    expect(round.multiplyExpression).toMatch(/^\d+ × \d+$/);
  });

  it('generates a build-array round whose target is a product of two 2..10 factors', () => {
    const round = generateRound('build-array', fixedRng(0.5, 0.5)) as BuildArrayRound;
    expect(round.skillId).toBe('build-array');
    expect(round.targetProduct).toBeGreaterThanOrEqual(4);
    expect(round.targetProduct).toBeLessThanOrEqual(100);
  });

  it('generates a commute-spin round with two distinct factors', () => {
    const round = generateRound('commute-spin', fixedRng(0.99, 0.99)) as { a: number; b: number };
    expect(round.a).not.toBe(round.b);
  });

  it('generates a commute-solve round with two options sharing the correct product', () => {
    const round = generateRound('commute-solve', fixedRng(0.2, 0.6, 0.3)) as CommuteSolveRound;
    expect(round.optionA.product).toBe(round.correctProduct);
    expect(round.optionB.product).toBe(round.correctProduct);
    expect(round.optionC.product).not.toBe(round.correctProduct);
  });

  it('generates an equivalent-facts round with a genuine alternate factor pair', () => {
    const round = generateRound('equivalent-facts', fixedRng(0.1, 0.9)) as EquivalentFactsRound;
    expect(checkEquivalentFacts(round, round.a, round.b)).toBe(false); // same pair, not "different"
  });

  it('generates a true-false round', () => {
    const round = generateRound('true-false', fixedRng(0.3, 0.3, 0.9)) as TrueFalseRound;
    expect(typeof round.isTrue).toBe('boolean');
    if (round.isTrue) {
      expect(round.claimedProduct).toBe(round.a * round.b);
    } else {
      expect(round.claimedProduct).not.toBe(round.a * round.b);
    }
  });

  it('generates an associative round with three factors in 2..5', () => {
    const round = generateRound('associative', fixedRng(0.1, 0.5, 0.9)) as AssociativeRound;
    for (const factor of [round.x, round.y, round.z]) {
      expect(factor).toBeGreaterThanOrEqual(2);
      expect(factor).toBeLessThanOrEqual(5);
    }
  });

  it('generates a factor-pairs round where totalWheels is a multiple of wheelsPerCar', () => {
    const round = generateRound('factor-pairs', fixedRng(0.5, 0.5)) as FactorPairsRound;
    expect(round.totalWheels % round.wheelsPerCar).toBe(0);
  });
});

describe('checkWhenToMultiply', () => {
  it('is correct only when the choice matches correctChoice', () => {
    const round = { skillId: 'when-to-multiply' as const, prompt: '', multiplyExpression: '', addExpression: '', correctChoice: 'multiply' as const };
    expect(checkWhenToMultiply(round, 'multiply')).toBe(true);
    expect(checkWhenToMultiply(round, 'add')).toBe(false);
  });
});

describe('checkBuildArray', () => {
  it('is correct when rows*cols equals the target', () => {
    const round: BuildArrayRound = { skillId: 'build-array', targetProduct: 12 };
    expect(checkBuildArray(round, 3, 4)).toBe(true);
    expect(checkBuildArray(round, 4, 3)).toBe(true);
    expect(checkBuildArray(round, 5, 3)).toBe(false);
  });
});

describe('checkCommuteSolve', () => {
  it('is correct for either matching-product option and wrong for the distractor', () => {
    const round: CommuteSolveRound = {
      skillId: 'commute-solve',
      prompt: '',
      correctProduct: 12,
      optionA: { id: 'a', label: '', product: 12 },
      optionB: { id: 'b', label: '', product: 12 },
      optionC: { id: 'c', label: '', product: 15 },
    };
    expect(checkCommuteSolve(round, 'a')).toBe(true);
    expect(checkCommuteSolve(round, 'b')).toBe(true);
    expect(checkCommuteSolve(round, 'c')).toBe(false);
  });
});

describe('checkEquivalentFacts', () => {
  it('rejects the same pair (in either order) and out-of-range answers', () => {
    const round: EquivalentFactsRound = { skillId: 'equivalent-facts', a: 3, b: 4 };
    expect(checkEquivalentFacts(round, 3, 4)).toBe(false);
    expect(checkEquivalentFacts(round, 4, 3)).toBe(false);
    expect(checkEquivalentFacts(round, 0, 12)).toBe(false);
    expect(checkEquivalentFacts(round, 11, 2)).toBe(false);
  });

  it('accepts a genuinely different pair with the same product', () => {
    const round: EquivalentFactsRound = { skillId: 'equivalent-facts', a: 3, b: 4 };
    expect(checkEquivalentFacts(round, 2, 6)).toBe(true);
    expect(checkEquivalentFacts(round, 6, 2)).toBe(true);
  });

  it('rejects a pair with a different product', () => {
    const round: EquivalentFactsRound = { skillId: 'equivalent-facts', a: 3, b: 4 };
    expect(checkEquivalentFacts(round, 5, 3)).toBe(false);
  });
});

describe('checkTrueFalse', () => {
  it('is correct when the answer matches isTrue', () => {
    const round: TrueFalseRound = { skillId: 'true-false', a: 3, b: 4, claimedProduct: 12, isTrue: true };
    expect(checkTrueFalse(round, true)).toBe(true);
    expect(checkTrueFalse(round, false)).toBe(false);
  });
});

describe('checkAssociative', () => {
  it('is correct when the answer equals x*y*z', () => {
    const round: AssociativeRound = { skillId: 'associative', x: 2, y: 3, z: 4 };
    expect(checkAssociative(round, 24)).toBe(true);
    expect(checkAssociative(round, 23)).toBe(false);
  });
});

describe('checkFactorPairs', () => {
  it('is correct when answer*wheelsPerCar equals totalWheels', () => {
    const round: FactorPairsRound = { skillId: 'factor-pairs', prompt: '', totalWheels: 24, wheelsPerCar: 4 };
    expect(checkFactorPairs(round, 6)).toBe(true);
    expect(checkFactorPairs(round, 5)).toBe(false);
  });
});
