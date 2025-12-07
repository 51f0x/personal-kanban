import { ValueObject } from '../base/value-object';

/**
 * WipLimit is a value object representing a Work-In-Progress limit.
 * It encapsulates validation logic and provides type safety.
 */
export class WipLimit extends ValueObject {
    private readonly _value: number;

    private constructor(value: number) {
        super();
        if (value < 0) {
            throw new Error('WIP limit cannot be negative');
        }
        if (value === 0) {
            throw new Error('WIP limit cannot be zero (use unlimited() for no limit)');
        }
        this._value = value;
    }

    /**
     * Create a WipLimit from a number
     */
    static from(value: number): WipLimit {
        return new WipLimit(value);
    }

    /**
     * Create an unlimited WIP limit
     */
    static unlimited(): WipLimit {
        return new WipLimit(Number.MAX_SAFE_INTEGER);
    }

    /**
     * Check if the limit is unlimited
     */
    isUnlimited(): boolean {
        return this._value === Number.MAX_SAFE_INTEGER;
    }

    /**
     * Check if the current count exceeds the limit
     */
    isExceeded(currentCount: number): boolean {
        if (this.isUnlimited()) {
            return false;
        }
        return currentCount >= this._value;
    }

    /**
     * Check if the current count would exceed the limit
     */
    wouldExceed(currentCount: number): boolean {
        if (this.isUnlimited()) {
            return false;
        }
        return currentCount >= this._value;
    }

    /**
     * Get the remaining capacity
     */
    remainingCapacity(currentCount: number): number {
        if (this.isUnlimited()) {
            return Number.MAX_SAFE_INTEGER;
        }
        return Math.max(0, this._value - currentCount);
    }

    /**
     * Check if two WipLimits are equal
     */
    equals(other: ValueObject | null | undefined): boolean {
        if (other === null || other === undefined) {
            return false;
        }
        if (!(other instanceof WipLimit)) {
            return false;
        }
        return this._value === other._value;
    }

    /**
     * Get the numeric value
     */
    get value(): number {
        return this._value;
    }

    /**
     * Get value for serialization
     */
    getValue(): unknown {
        return this._value;
    }

    /**
     * Convert to string
     */
    toString(): string {
        if (this.isUnlimited()) {
            return 'unlimited';
        }
        return this._value.toString();
    }
}
