import { ConceptSkillId } from './types';

export interface WhenToMultiplyRound {
  skillId: 'when-to-multiply';
  prompt: string;
  multiplyExpression: string;
  addExpression: string;
  correctChoice: 'multiply' | 'add';
}

export interface BuildArrayRound {
  skillId: 'build-array';
  targetProduct: number;
}

export interface CommuteSpinRound {
  skillId: 'commute-spin';
  a: number;
  b: number;
}

export interface CommuteSolveRound {
  skillId: 'commute-solve';
  prompt: string;
  correctProduct: number;
  optionA: { id: string; label: string; product: number };
  optionB: { id: string; label: string; product: number };
  optionC: { id: string; label: string; product: number };
}

export interface EquivalentFactsRound {
  skillId: 'equivalent-facts';
  a: number;
  b: number;
}

export interface TrueFalseRound {
  skillId: 'true-false';
  a: number;
  b: number;
  claimedProduct: number;
  isTrue: boolean;
}

export interface AssociativeRound {
  skillId: 'associative';
  x: number;
  y: number;
  z: number;
}

export interface FactorPairsRound {
  skillId: 'factor-pairs';
  prompt: string;
  totalWheels: number;
  wheelsPerCar: number;
}

export type CoveRound =
  | WhenToMultiplyRound
  | BuildArrayRound
  | CommuteSpinRound
  | CommuteSolveRound
  | EquivalentFactsRound
  | TrueFalseRound
  | AssociativeRound
  | FactorPairsRound;

function randInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

const NOUNS = ['fish', 'shells', 'starfish', 'crates'];

function generateWhenToMultiply(rng: () => number): WhenToMultiplyRound {
  const a = randInt(2, 10, rng);
  const b = randInt(2, 10, rng);
  const asMultiply = rng() < 0.5;
  const noun = pick(NOUNS, rng);
  const prompt = asMultiply
    ? `There are ${a} baskets with ${b} ${noun} in each. How many ${noun} in all?`
    : `There are ${a} ${noun} in one tide pool, then ${b} more ${noun} are found nearby. How many ${noun} in all?`;
  return {
    skillId: 'when-to-multiply',
    prompt,
    multiplyExpression: `${a} × ${b}`,
    addExpression: `${a} + ${b}`,
    correctChoice: asMultiply ? 'multiply' : 'add',
  };
}

function generateBuildArray(rng: () => number): BuildArrayRound {
  const a = randInt(2, 10, rng);
  const b = randInt(2, 10, rng);
  return { skillId: 'build-array', targetProduct: a * b };
}

function generateCommuteSpin(rng: () => number): CommuteSpinRound {
  const a = randInt(2, 10, rng);
  let b = randInt(2, 10, rng);
  if (b === a) {
    b = a === 10 ? a - 1 : a + 1;
  }
  return { skillId: 'commute-spin', a, b };
}

function generateCommuteSolve(rng: () => number): CommuteSolveRound {
  const a = randInt(2, 10, rng);
  const b = randInt(2, 10, rng);
  const correctProduct = a * b;
  let wrongProduct = correctProduct + randInt(1, 5, rng);
  if (wrongProduct === correctProduct) wrongProduct += 1;
  const noun = pick(NOUNS, rng);
  const prompt = `${a} rows of ${noun}, ${b} in each row. How many ${noun} in all?`;
  return {
    skillId: 'commute-solve',
    prompt,
    correctProduct,
    optionA: { id: 'a', label: `${a} × ${b} = ${correctProduct}`, product: correctProduct },
    optionB: { id: 'b', label: `${b} × ${a} = ${correctProduct}`, product: correctProduct },
    optionC: { id: 'c', label: `${a} × ${b} = ${wrongProduct}`, product: wrongProduct },
  };
}

function findAlternateFactorPair(target: number, a: number, b: number): [number, number] | null {
  for (let c = 1; c <= 10; c++) {
    if (target % c !== 0) continue;
    const d = target / c;
    if (d < 1 || d > 10) continue;
    const sameAsShown = (c === a && d === b) || (c === b && d === a);
    if (!sameAsShown) return [c, d];
  }
  return null;
}

function generateEquivalentFacts(rng: () => number): EquivalentFactsRound {
  for (let attempt = 0; attempt < 20; attempt++) {
    const a = randInt(2, 6, rng);
    const b = randInt(2, 10, rng);
    if (findAlternateFactorPair(a * b, a, b)) {
      return { skillId: 'equivalent-facts', a, b };
    }
  }
  return { skillId: 'equivalent-facts', a: 2, b: 6 }; // 12 = 3×4, guaranteed alternate
}

function generateTrueFalse(rng: () => number): TrueFalseRound {
  const a = randInt(2, 10, rng);
  const b = randInt(2, 10, rng);
  const correctProduct = a * b;
  const isTrue = rng() < 0.5;
  if (isTrue) {
    return { skillId: 'true-false', a, b, claimedProduct: correctProduct, isTrue: true };
  }
  const delta = randInt(1, 5, rng);
  const claimedProduct =
    correctProduct - delta < 1 ? correctProduct + delta : correctProduct + (rng() < 0.5 ? -delta : delta);
  return { skillId: 'true-false', a, b, claimedProduct, isTrue: false };
}

function generateAssociative(rng: () => number): AssociativeRound {
  return {
    skillId: 'associative',
    x: randInt(2, 5, rng),
    y: randInt(2, 5, rng),
    z: randInt(2, 5, rng),
  };
}

function generateFactorPairs(rng: () => number): FactorPairsRound {
  const wheelsPerCar = randInt(2, 6, rng);
  const numCars = randInt(2, 10, rng);
  const totalWheels = wheelsPerCar * numCars;
  return {
    skillId: 'factor-pairs',
    prompt: `A toy workshop builds models with ${wheelsPerCar} wheels each. They have ${totalWheels} wheels. How many models can they build?`,
    totalWheels,
    wheelsPerCar,
  };
}

export function generateRound(skillId: ConceptSkillId, rng: () => number = Math.random): CoveRound {
  switch (skillId) {
    case 'when-to-multiply':
      return generateWhenToMultiply(rng);
    case 'build-array':
      return generateBuildArray(rng);
    case 'commute-spin':
      return generateCommuteSpin(rng);
    case 'commute-solve':
      return generateCommuteSolve(rng);
    case 'equivalent-facts':
      return generateEquivalentFacts(rng);
    case 'true-false':
      return generateTrueFalse(rng);
    case 'associative':
      return generateAssociative(rng);
    case 'factor-pairs':
      return generateFactorPairs(rng);
  }
}

export function checkWhenToMultiply(round: WhenToMultiplyRound, choice: 'multiply' | 'add'): boolean {
  return choice === round.correctChoice;
}

export function checkBuildArray(round: BuildArrayRound, rows: number, cols: number): boolean {
  return rows * cols === round.targetProduct;
}

export function checkCommuteSolve(round: CommuteSolveRound, optionId: string): boolean {
  const options = [round.optionA, round.optionB, round.optionC];
  const chosen = options.find(o => o.id === optionId);
  return chosen !== undefined && chosen.product === round.correctProduct;
}

export function checkEquivalentFacts(round: EquivalentFactsRound, c: number, d: number): boolean {
  if (c < 1 || c > 10 || d < 1 || d > 10) return false;
  const sameAsShown = (c === round.a && d === round.b) || (c === round.b && d === round.a);
  return !sameAsShown && c * d === round.a * round.b;
}

export function checkTrueFalse(round: TrueFalseRound, answer: boolean): boolean {
  return answer === round.isTrue;
}

export function checkAssociative(round: AssociativeRound, answer: number): boolean {
  return answer === round.x * round.y * round.z;
}

export function checkFactorPairs(round: FactorPairsRound, answer: number): boolean {
  return answer * round.wheelsPerCar === round.totalWheels;
}
