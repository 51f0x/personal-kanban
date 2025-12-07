/**
 * ValueObject is the base class for value objects.
 * Value objects are defined by their attributes rather than their identity.
 * Two value objects are equal if all their attributes are equal.
 */
export abstract class ValueObject {
    /**
     * Check if two value objects are equal
     */
    abstract equals(other: ValueObject | null | undefined): boolean;

    /**
     * Get the value object's value (for serialization)
     */
    abstract getValue(): unknown;
}
