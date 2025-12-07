/**
 * Entity is the base class for domain entities.
 * Entities are objects that have a distinct identity that runs through time
 * and different representations.
 */
export abstract class Entity {
    protected readonly _id: string;

    constructor(id: string) {
        if (!id) {
            throw new Error('Entity ID cannot be empty');
        }
        this._id = id;
    }

    /**
     * Get the entity's unique identifier
     */
    get id(): string {
        return this._id;
    }

    /**
     * Check if two entities are the same (by ID)
     */
    equals(other: Entity | null | undefined): boolean {
        if (other === null || other === undefined) {
            return false;
        }

        if (this === other) {
            return true;
        }

        if (!(other instanceof Entity)) {
            return false;
        }

        return this._id === other._id;
    }
}
