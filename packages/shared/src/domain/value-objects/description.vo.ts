import { ValueObject } from '../base/value-object';

/**
 * Description is a value object representing a description string.
 * It provides validation and type safety for descriptions.
 */
export class Description extends ValueObject {
    private readonly _value: string;
    private static readonly MAX_LENGTH = 10000;

    private constructor(value: string) {
        super();
        if (value.length > Description.MAX_LENGTH) {
            throw new Error(`Description cannot exceed ${Description.MAX_LENGTH} characters`);
        }
        this._value = value;
    }

    /**
     * Create a Description from a string
     * Empty strings are allowed (use null/undefined for no description)
     */
    static from(value: string | null | undefined): Description | null {
        if (value === null || value === undefined || value.trim().length === 0) {
            return null;
        }
        return new Description(value);
    }

    /**
     * Check if two Descriptions are equal
     */
    equals(other: ValueObject | null | undefined): boolean {
        if (other === null || other === undefined) {
            return false;
        }
        if (!(other instanceof Description)) {
            return false;
        }
        return this._value === other._value;
    }

    /**
     * Get the string value
     */
    get value(): string {
        return this._value;
    }

    /**
     * Get the length of the description
     */
    get length(): number {
        return this._value.length;
    }

    /**
     * Check if description is empty
     */
    isEmpty(): boolean {
        return this._value.trim().length === 0;
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
        return this._value;
    }
}
