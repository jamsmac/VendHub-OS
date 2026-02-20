import { SessionStep } from '../types';

// ============================================
// State Machine Definition
// ============================================

export interface StateDefinition {
  name: SessionStep;
  allowedTransitions: SessionStep[];
  timeout?: number; // Auto-reset after timeout (ms)
  onEnter?: () => void;
  onExit?: () => void;
}

export const states: Record<NonNullable<SessionStep>, StateDefinition> = {
  awaiting_location: {
    name: 'awaiting_location',
    allowedTransitions: [undefined, 'awaiting_complaint'],
    timeout: 300000, // 5 minutes
  },
  awaiting_phone: {
    name: 'awaiting_phone',
    allowedTransitions: [undefined],
    timeout: 300000,
  },
  awaiting_feedback: {
    name: 'awaiting_feedback',
    allowedTransitions: [undefined],
    timeout: 600000, // 10 minutes
  },
  awaiting_complaint: {
    name: 'awaiting_complaint',
    allowedTransitions: [undefined, 'awaiting_location'],
    timeout: 600000,
  },
  awaiting_product_quantity: {
    name: 'awaiting_product_quantity',
    allowedTransitions: [undefined, 'confirming_order'],
    timeout: 300000,
  },
  confirming_order: {
    name: 'confirming_order',
    allowedTransitions: [undefined, 'awaiting_product_quantity'],
    timeout: 600000,
  },
  trip_active: {
    name: 'trip_active',
    allowedTransitions: [undefined],
    timeout: 28800000, // 8 hours
  },
  trip_selecting_vehicle: {
    name: 'trip_selecting_vehicle',
    allowedTransitions: [undefined, 'trip_selecting_route', 'trip_active'],
    timeout: 300000, // 5 minutes
  },
  trip_selecting_route: {
    name: 'trip_selecting_route',
    allowedTransitions: [undefined, 'trip_selecting_vehicle', 'trip_active'],
    timeout: 300000, // 5 minutes
  },
};

// ============================================
// State Machine Class
// ============================================

export class StateMachine {
  private currentState: SessionStep = undefined;

  constructor(initialState?: SessionStep) {
    this.currentState = initialState;
  }

  /**
   * Get current state
   */
  getState(): SessionStep {
    return this.currentState;
  }

  /**
   * Check if transition is allowed
   */
  canTransition(newState: SessionStep): boolean {
    if (this.currentState === undefined) {
      return true; // Can transition from initial state to any state
    }

    const stateConfig = states[this.currentState];
    if (!stateConfig) return true;

    return stateConfig.allowedTransitions.includes(newState);
  }

  /**
   * Transition to new state
   */
  transition(newState: SessionStep): boolean {
    if (!this.canTransition(newState)) {
      console.warn(`Invalid transition from ${this.currentState} to ${newState}`);
      return false;
    }

    // Call onExit for current state
    if (this.currentState && states[this.currentState]?.onExit) {
      states[this.currentState].onExit!();
    }

    // Update state
    this.currentState = newState;

    // Call onEnter for new state
    if (newState && states[newState]?.onEnter) {
      states[newState].onEnter!();
    }

    return true;
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.transition(undefined);
  }

  /**
   * Check if in specific state
   */
  isInState(state: SessionStep): boolean {
    return this.currentState === state;
  }

  /**
   * Check if awaiting any input
   */
  isAwaitingInput(): boolean {
    return this.currentState !== undefined;
  }
}

// ============================================
// State Helpers
// ============================================

/**
 * Check if session is in valid state for action
 */
export function isValidState(
  currentStep: SessionStep,
  expectedStep: SessionStep
): boolean {
  return currentStep === expectedStep;
}

/**
 * Get state timeout
 */
export function getStateTimeout(step: SessionStep): number {
  if (!step) return 0;
  return states[step]?.timeout || 300000;
}

/**
 * Create state machine from session
 */
export function createStateMachine(sessionStep?: SessionStep): StateMachine {
  return new StateMachine(sessionStep);
}

// ============================================
// State Constants
// ============================================

export const STATE_NAMES = {
  AWAITING_LOCATION: 'awaiting_location' as const,
  AWAITING_PHONE: 'awaiting_phone' as const,
  AWAITING_FEEDBACK: 'awaiting_feedback' as const,
  AWAITING_COMPLAINT: 'awaiting_complaint' as const,
  AWAITING_PRODUCT_QUANTITY: 'awaiting_product_quantity' as const,
  CONFIRMING_ORDER: 'confirming_order' as const,
  TRIP_ACTIVE: 'trip_active' as const,
  TRIP_SELECTING_VEHICLE: 'trip_selecting_vehicle' as const,
  TRIP_SELECTING_ROUTE: 'trip_selecting_route' as const,
};

export default {
  StateMachine,
  states,
  isValidState,
  getStateTimeout,
  createStateMachine,
  STATE_NAMES,
};
