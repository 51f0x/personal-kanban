import { ValueObject } from '../base/value-object';

/**
 * Title is a value object representing a title string.
 * It provides validation and type safety for titles.
 */
export class Title extends ValueObject {
    private readonly _value: string;
    private static readonly MAX_LENGTH = 500;
    private static readonly MIN_LENGTH = 1;

    private constructor(value: string) {
        super();
        const trimmed = value.trim();
        if (trimmed.length < Title.MIN_LENGTH) {
            throw new Error('Title cannot be empty');
        }
        if (trimmed.length > Title.MAX_LENGTH) {
            throw new Error(`Title cannot exceed ${Title.MAX_LENGTH} characters`);
        }
        this._value = trimmed;
    }

    /**
     * Create a Title from a string
     */
    static from(value: string): Title {
        return new Title(value);
    }

    /**
     * Check if two Titles are equal
     */
    equals(other: ValueObject | null | undefined): boolean {
        if (other === null || other === undefined) {
            return false;
        }
        if (!(other instanceof Title)) {
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
     * Get the length of the title
     */
    get length(): number {
        return this._value.length;
    }

    /**
     * Check if title is empty (should never be true after construction)
     */
    isEmpty(): boolean {
        return this._value.length === 0;
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
