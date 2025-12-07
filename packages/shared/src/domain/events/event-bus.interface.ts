import { DomainEvent } from '../base/domain-event';

/**
 * Event Bus Interface
 * Defines the contract for publishing and subscribing to domain events
 */
export interface IEventBus {
    /**
     * Publish a domain event
     */
    publish(event: DomainEvent): Promise<void>;

    /**
     * Publish multiple domain events atomically
     */
    publishAll(events: DomainEvent[]): Promise<void>;

    /**
     * Subscribe to events of a specific type
     * @param eventType The event class/type to subscribe to
     * @param handler The handler function to call when the event is received
     */
    subscribe<T extends DomainEvent>(
        eventType: new (...args: any[]) => T,
        handler: (event: T) => Promise<void> | void,
    ): void;

    /**
     * Unsubscribe from events of a specific type
     */
    unsubscribe<T extends DomainEvent>(
        eventType: new (...args: any[]) => T,
        handler: (event: T) => Promise<void> | void,
    ): void;
}
