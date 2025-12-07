import { ValueObject } from '../base/value-object';

/**
 * ColumnId is a value object representing a unique column identifier.
 */
export class ColumnId extends ValueObject {
    private readonly _value: string;

    private constructor(value: string) {
        super();
        if (!this.isValid(value)) {
            throw new Error(`Invalid ColumnId: ${value}`);
        }
        this._value = value;
    }

    static from(value: string): ColumnId {
        return new ColumnId(value);
    }

    static generate(): ColumnId {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return new ColumnId(crypto.randomUUID());
        }
        return new ColumnId(this.generateUUID());
    }

    private static generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    equals(other: ValueObject | null | undefined): boolean {
        if (other === null || other === undefined) {
            return false;
        }
        if (!(other instanceof ColumnId)) {
            return false;
        }
        return this._value === other._value;
    }

    get value(): string {
        return this._value;
    }

    toString(): string {
        return this._value;
    }

    getValue(): unknown {
        return this._value;
    }

    private isValid(value: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value);
    }
}
