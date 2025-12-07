/**
 * DomainEvent is the base class for all domain events.
 * Domain events represent something that happened in the domain that other parts
 * of the system might be interested in.
 */
export abstract class DomainEvent {
    public readonly occurredOn: Date;
    public readonly aggregateId: string;

    constructor(aggregateId: string) {
        this.aggregateId = aggregateId;
        this.occurredOn = new Date();
    }

    /**
     * Get the event name (typically the class name)
     */
    get eventName(): string {
        return this.constructor.name;
    }
}
