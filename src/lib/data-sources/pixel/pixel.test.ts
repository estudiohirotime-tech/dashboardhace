import { describe, it, expect } from "vitest";
import { stagesFromCounts } from "../aggregations";
import { pixelBatchSchema, normalizeBatch, EVENT_TO_STAGE } from "./schemas";

describe("stagesFromCounts", () => {
  it("calcula conversões e gargalo a partir de contagens reais", () => {
    const stages = stagesFromCounts({
      sessions: 1000,
      product_view: 420,
      add_to_cart: 46,
      checkout_started: 27,
      checkout_info: 19,
      purchase: 12,
    });
    const byStage = Object.fromEntries(stages.map((s) => [s.key, s]));
    expect(byStage.sessions!.conversionFromPrevious).toBe(1);
    expect(byStage.product_view!.conversionFromPrevious).toBeCloseTo(0.42, 2);
    // Maior queda percentual: product_view -> add_to_cart.
    expect(byStage.add_to_cart!.isBottleneck).toBe(true);
    expect(stages.every((s) => s.isMock === false)).toBe(true);
    expect(byStage.purchase!.conversionFromTop).toBeCloseTo(0.012, 3);
  });
});

describe("EVENT_TO_STAGE", () => {
  it("mapeia eventos do storefront para etapas", () => {
    expect(EVENT_TO_STAGE.page_viewed).toBe("sessions");
    expect(EVENT_TO_STAGE.product_added_to_cart).toBe("add_to_cart");
    expect(EVENT_TO_STAGE.checkout_completed).toBe("purchase");
  });
});

describe("pixelBatchSchema / normalizeBatch", () => {
  it("aceita evento único, array e objeto { events }", () => {
    const one = { event: "page_viewed", sessionId: "s1" };
    expect(normalizeBatch(pixelBatchSchema.parse(one))).toHaveLength(1);
    expect(normalizeBatch(pixelBatchSchema.parse([one, one]))).toHaveLength(2);
    expect(normalizeBatch(pixelBatchSchema.parse({ events: [one] }))).toHaveLength(1);
  });

  it("rejeita evento desconhecido", () => {
    expect(pixelBatchSchema.safeParse({ event: "foo", sessionId: "s1" }).success).toBe(false);
  });
});
