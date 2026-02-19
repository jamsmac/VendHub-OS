import {
  StateMachine,
  states,
  isValidState,
  getStateTimeout,
  createStateMachine,
  STATE_NAMES,
} from "../states";

// ============================================
// State Definitions
// ============================================

describe("states config", () => {
  it("defines 9 states", () => {
    expect(Object.keys(states)).toHaveLength(9);
  });

  it("every state has a name matching its key", () => {
    for (const [key, def] of Object.entries(states)) {
      expect(def.name).toBe(key);
    }
  });

  it("every state has a timeout", () => {
    for (const def of Object.values(states)) {
      expect(def.timeout).toBeGreaterThan(0);
    }
  });

  it("every state allows transition to undefined (reset)", () => {
    for (const def of Object.values(states)) {
      expect(def.allowedTransitions).toContain(undefined);
    }
  });
});

// ============================================
// StateMachine class
// ============================================

describe("StateMachine", () => {
  describe("constructor & getState", () => {
    it("starts in undefined (idle) state by default", () => {
      const sm = new StateMachine();
      expect(sm.getState()).toBeUndefined();
    });

    it("can start in a specific state", () => {
      const sm = new StateMachine("awaiting_location");
      expect(sm.getState()).toBe("awaiting_location");
    });
  });

  describe("isInState", () => {
    it("returns true for matching state", () => {
      const sm = new StateMachine("awaiting_phone");
      expect(sm.isInState("awaiting_phone")).toBe(true);
    });

    it("returns false for non-matching state", () => {
      const sm = new StateMachine("awaiting_phone");
      expect(sm.isInState("awaiting_location")).toBe(false);
    });

    it("returns true for undefined when idle", () => {
      const sm = new StateMachine();
      expect(sm.isInState(undefined)).toBe(true);
    });
  });

  describe("isAwaitingInput", () => {
    it("returns false when idle", () => {
      const sm = new StateMachine();
      expect(sm.isAwaitingInput()).toBe(false);
    });

    it("returns true when in any state", () => {
      const sm = new StateMachine("awaiting_feedback");
      expect(sm.isAwaitingInput()).toBe(true);
    });
  });

  describe("canTransition", () => {
    it("can transition from idle to any state", () => {
      const sm = new StateMachine();
      expect(sm.canTransition("awaiting_location")).toBe(true);
      expect(sm.canTransition("trip_active")).toBe(true);
      expect(sm.canTransition(undefined)).toBe(true);
    });

    it("allows valid transition from awaiting_location", () => {
      const sm = new StateMachine("awaiting_location");
      expect(sm.canTransition(undefined)).toBe(true);
      expect(sm.canTransition("awaiting_complaint")).toBe(true);
    });

    it("rejects invalid transition from awaiting_location", () => {
      const sm = new StateMachine("awaiting_location");
      expect(sm.canTransition("trip_active")).toBe(false);
      expect(sm.canTransition("confirming_order")).toBe(false);
    });

    it("allows valid transitions for trip_selecting_vehicle", () => {
      const sm = new StateMachine("trip_selecting_vehicle");
      expect(sm.canTransition(undefined)).toBe(true);
      expect(sm.canTransition("trip_selecting_route")).toBe(true);
      expect(sm.canTransition("trip_active")).toBe(true);
    });

    it("rejects invalid transition for trip_selecting_vehicle", () => {
      const sm = new StateMachine("trip_selecting_vehicle");
      expect(sm.canTransition("awaiting_phone")).toBe(false);
    });
  });

  describe("transition", () => {
    it("transitions to valid state and returns true", () => {
      const sm = new StateMachine();
      expect(sm.transition("awaiting_location")).toBe(true);
      expect(sm.getState()).toBe("awaiting_location");
    });

    it("returns false for invalid transition", () => {
      const sm = new StateMachine("awaiting_phone");
      expect(sm.transition("trip_active")).toBe(false);
      expect(sm.getState()).toBe("awaiting_phone"); // state unchanged
    });

    it("can chain valid transitions", () => {
      const sm = new StateMachine();
      expect(sm.transition("awaiting_product_quantity")).toBe(true);
      expect(sm.transition("confirming_order")).toBe(true);
      expect(sm.getState()).toBe("confirming_order");
    });

    it("can transition back to idle", () => {
      const sm = new StateMachine("awaiting_feedback");
      expect(sm.transition(undefined)).toBe(true);
      expect(sm.getState()).toBeUndefined();
    });
  });

  describe("reset", () => {
    it("resets to idle state", () => {
      const sm = new StateMachine("trip_active");
      sm.reset();
      expect(sm.getState()).toBeUndefined();
      expect(sm.isAwaitingInput()).toBe(false);
    });
  });
});

// ============================================
// Helper Functions
// ============================================

describe("isValidState", () => {
  it("returns true when states match", () => {
    expect(isValidState("awaiting_location", "awaiting_location")).toBe(true);
    expect(isValidState(undefined, undefined)).toBe(true);
  });

  it("returns false when states differ", () => {
    expect(isValidState("awaiting_location", "awaiting_phone")).toBe(false);
    expect(isValidState(undefined, "awaiting_phone")).toBe(false);
  });
});

describe("getStateTimeout", () => {
  it("returns 0 for undefined (idle) state", () => {
    expect(getStateTimeout(undefined)).toBe(0);
  });

  it("returns 300000 (5min) for awaiting_location", () => {
    expect(getStateTimeout("awaiting_location")).toBe(300000);
  });

  it("returns 600000 (10min) for awaiting_feedback", () => {
    expect(getStateTimeout("awaiting_feedback")).toBe(600000);
  });

  it("returns 28800000 (8h) for trip_active", () => {
    expect(getStateTimeout("trip_active")).toBe(28800000);
  });
});

describe("createStateMachine", () => {
  it("creates idle machine by default", () => {
    const sm = createStateMachine();
    expect(sm.getState()).toBeUndefined();
  });

  it("creates machine with initial state", () => {
    const sm = createStateMachine("awaiting_phone");
    expect(sm.getState()).toBe("awaiting_phone");
  });
});

// ============================================
// State Constants
// ============================================

describe("STATE_NAMES", () => {
  it("has all 9 state constants", () => {
    expect(Object.keys(STATE_NAMES)).toHaveLength(9);
  });

  it("each constant matches its state key", () => {
    expect(STATE_NAMES.AWAITING_LOCATION).toBe("awaiting_location");
    expect(STATE_NAMES.TRIP_ACTIVE).toBe("trip_active");
    expect(STATE_NAMES.CONFIRMING_ORDER).toBe("confirming_order");
  });
});
