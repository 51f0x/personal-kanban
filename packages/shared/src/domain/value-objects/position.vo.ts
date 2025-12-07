import { ValueObject } from '../base/value-object';

/**
 * Position is a value object representing a position/order within a collection.
 * It provides type safety and validation for position values.
 */
export class Position extends ValueObject {
    private readonly _value: number;

    private constructor(value: number) {
        super();
        if (value < 0) {
            throw new Error('Position cannot be negative');
        }
        if (!Number.isInteger(value)) {
            throw new Error('Position must be an integer');
        }
        this._value = value;
    }

    /**
     * Create a Position from a number
     */
    static from(value: number): Position {
        return new Position(value);
    }

    /**
     * Create the initial position (0)
     */
    static initial(): Position {
        return new Position(0);
    }

    /**
     * Create a position at the end (for appending)
     */
    static end(currentMax: number): Position {
        return new Position(currentMax + 1);
    }

    /**
     * Check if two Positions are equal
     */
    equals(other: ValueObject | null | undefined): boolean {
        if (other === null || other === undefined) {
            return false;
        }
        if (!(other instanceof Position)) {
            return false;
        }
        return this._value === other._value;
    }

    /**
     * Compare two positions
     * @returns -1 if this < other, 0 if equal, 1 if this > other
     */
    compareTo(other: Position): number {
        if (this._value < other._value) {
            return -1;
        }
        if (this._value > other._value) {
            return 1;
        }
        return 0;
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
        return this._value.toString();
    }
}
