/**
 * Bayesian Belief Network data model types.
 */

/** A single row in a conditional probability table */
export interface CPTRow {
  /** Parent state assignments, keyed by parent node id */
  conditions: Record<string, string>;
  /** Probabilities for each state of this node */
  probabilities: Record<string, number>;
}

/** Conditional probability table for a node with parents */
export type CPT = CPTRow[];

/** Prior probability distribution for a root node (no parents) */
export type PriorDistribution = Record<string, number>;

/** A node in the Bayesian Belief Network */
export interface BBNNode {
  id: string;
  label: string;
  /** Possible discrete states */
  states: string[];
  /** Description of what this node represents */
  description?: string;
  /** CPT if node has parents, or prior distribution if root */
  cpt: CPT | PriorDistribution;
  /** Optional observed evidence (clamped state) */
  evidence?: string;
  /** Arbitrary metadata */
  meta?: Record<string, unknown>;
}

/** A directed edge in the BBN (parent → child) */
export interface BBNEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  /** Strength hint for visual weight (0-1) */
  strength?: number;
  meta?: Record<string, unknown>;
}

/** Full Bayesian Belief Network definition */
export interface BBNDefinition {
  name: string;
  description?: string;
  nodes: BBNNode[];
  edges: BBNEdge[];
}

/** Selection state for the UI */
export type Selection =
  | { type: "node"; id: string }
  | { type: "edge"; id: string }
  | null;
