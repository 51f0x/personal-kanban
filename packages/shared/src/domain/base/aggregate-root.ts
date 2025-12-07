import { DomainEvent } from './domain-event';

/**
 * AggregateRoot is the base class for domain aggregates.
 * Aggregates are clusters of domain objects that can be treated as a single unit.
 * They maintain consistency boundaries and publish domain events.
 */
export abstract class AggregateRoot {
    private readonly _domainEvents: DomainEvent[] = [];

    /**
     * Get all domain events that have been raised
     */
    get domainEvents(): ReadonlyArray<DomainEvent> {
        return Object.freeze([...this._domainEvents]);
    }

    /**
     * Add a domain event to the aggregate
     */
    protected addDomainEvent(event: DomainEvent): void {
        this._domainEvents.push(event);
    }

    /**
     * Clear all domain events (typically called after they've been published)
     */
    clearDomainEvents(): void {
        this._domainEvents.length = 0;
    }

    /**
     * Check if there are any domain events
     */
    hasDomainEvents(): boolean {
        return this._domainEvents.length > 0;
    }
}
