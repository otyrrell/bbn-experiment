/**
 * Classic "Wet Grass" Bayesian network example.
 *
 * Structure:
 *   Cloudy -> Sprinkler -> Wet Grass <- Rain <- Cloudy
 *   Wet Grass -> Slippery
 */
export const wetGrassBBN = {
  name: "Wet Grass Network",
  description:
    "Classic BBN example modeling the causal relationships between weather, sprinklers, and grass conditions.",
  nodes: [
    {
      id: "cloudy",
      label: "Cloudy",
      states: ["true", "false"],
      description: "Whether the sky is overcast.",
      cpt: { true: 0.5, false: 0.5 },
    },
    {
      id: "sprinkler",
      label: "Sprinkler",
      states: ["on", "off"],
      description: "Whether the garden sprinkler is running.",
      cpt: [
        { conditions: { cloudy: "true" }, probabilities: { on: 0.1, off: 0.9 } },
        { conditions: { cloudy: "false" }, probabilities: { on: 0.5, off: 0.5 } },
      ],
    },
    {
      id: "rain",
      label: "Rain",
      states: ["heavy", "light", "none"],
      description: "Level of rainfall.",
      cpt: [
        { conditions: { cloudy: "true" }, probabilities: { heavy: 0.4, light: 0.4, none: 0.2 } },
        { conditions: { cloudy: "false" }, probabilities: { heavy: 0.05, light: 0.15, none: 0.8 } },
      ],
    },
    {
      id: "wet_grass",
      label: "Wet Grass",
      states: ["wet", "dry"],
      description: "Whether the grass is wet.",
      cpt: [
        { conditions: { sprinkler: "on", rain: "heavy" }, probabilities: { wet: 0.99, dry: 0.01 } },
        { conditions: { sprinkler: "on", rain: "light" }, probabilities: { wet: 0.95, dry: 0.05 } },
        { conditions: { sprinkler: "on", rain: "none" }, probabilities: { wet: 0.9, dry: 0.1 } },
        { conditions: { sprinkler: "off", rain: "heavy" }, probabilities: { wet: 0.95, dry: 0.05 } },
        { conditions: { sprinkler: "off", rain: "light" }, probabilities: { wet: 0.7, dry: 0.3 } },
        { conditions: { sprinkler: "off", rain: "none" }, probabilities: { wet: 0.0, dry: 1.0 } },
      ],
      evidence: "wet",
    },
    {
      id: "slippery",
      label: "Slippery Path",
      states: ["yes", "no"],
      description: "Whether the garden path is slippery.",
      cpt: [
        { conditions: { wet_grass: "wet" }, probabilities: { yes: 0.7, no: 0.3 } },
        { conditions: { wet_grass: "dry" }, probabilities: { yes: 0.05, no: 0.95 } },
      ],
      meta: { risk_level: "medium", location: "garden path" },
    },
  ],
  edges: [
    { id: "e1", source: "cloudy", target: "sprinkler", label: "influences", strength: 0.5 },
    { id: "e2", source: "cloudy", target: "rain", label: "causes", strength: 0.8 },
    { id: "e3", source: "sprinkler", target: "wet_grass", label: "wets" },
    { id: "e4", source: "rain", target: "wet_grass", label: "wets", strength: 0.9 },
    { id: "e5", source: "wet_grass", target: "slippery", label: "causes", strength: 0.7 },
  ],
};
