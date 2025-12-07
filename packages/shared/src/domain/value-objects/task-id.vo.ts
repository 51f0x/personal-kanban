import { ValueObject } from '../base/value-object';

/**
 * TaskId is a value object representing a unique task identifier.
 * It provides type safety and validation for task IDs.
 */
export class TaskId extends ValueObject {
    private readonly _value: string;

    private constructor(value: string) {
        super();
        if (!this.isValid(value)) {
            throw new Error(`Invalid TaskId: ${value}`);
        }
        this._value = value;
    }

    /**
     * Create a TaskId from a string value
     */
    static from(value: string): TaskId {
        return new TaskId(value);
    }

    /**
     * Generate a new TaskId (UUID v4)
     */
    static generate(): TaskId {
        // Using crypto.randomUUID() if available, otherwise fallback
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return new TaskId(crypto.randomUUID());
        }
        // Fallback for environments without crypto.randomUUID
        return new TaskId(this.generateUUID());
    }

    /**
     * Generate UUID v4 (fallback implementation)
     */
    private static generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    /**
     * Check if two TaskIds are equal
     */
    equals(other: ValueObject | null | undefined): boolean {
        if (other === null || other === undefined) {
            return false;
        }
        if (!(other instanceof TaskId)) {
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
     * Convert to string
     */
    toString(): string {
        return this._value;
    }

    /**
     * Get value for serialization
     */
    getValue(): unknown {
        return this._value;
    }

    /**
     * Validate UUID format
     */
    private isValid(value: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value);
    }
}
