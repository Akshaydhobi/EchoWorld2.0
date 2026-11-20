/**
 * Deterministic Mulberry32 Pseudo-Random Number Generator.
 * Guarantees reproducible EchoWorld simulations and research trials
 * across restarts, pauses, and Windows/Linux environments.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = (Math.floor(seed) >>> 0) || 1;
  }

  public getState(): number {
    return this.state >>> 0;
  }

  public setState(savedState: number): void {
    this.state = (Math.floor(savedState) >>> 0) || 1;
  }

  /** Returns a deterministic float in [0, 1). */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns a deterministic float in [min, max). */
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Returns a deterministic integer in [min, max] inclusive. */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Picks one item deterministically from a non-empty array. */
  public pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array.');
    }
    return items[Math.floor(this.next() * items.length)];
  }
}
