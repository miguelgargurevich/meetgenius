import { describe, expect, it } from "vitest";
import { analysisSchema } from "./schema";
import { MockLanguageProvider } from "./providers/mock";

describe("analysisSchema", () => {
  it("aplica defaults y valida la forma canónica", () => {
    const parsed = analysisSchema.parse({
      summary: ["punto 1"],
      sentiment: "NEUTRAL",
      agreements: [{ title: "Acuerdo" }],
      tasks: [{ title: "Tarea" }],
      risks: [{ risk: "Riesgo" }],
      openQuestions: [],
      nextSteps: [],
    });
    expect(parsed.tasks[0].priority).toBe("MEDIUM");
    expect(parsed.tasks[0].status).toBe("TODO");
    expect(parsed.risks[0].impact).toBe("MEDIUM");
  });

  it("rechaza sentiment inválido", () => {
    expect(() =>
      analysisSchema.parse({
        summary: [],
        sentiment: "HAPPY",
        agreements: [],
        tasks: [],
        risks: [],
        openQuestions: [],
        nextSteps: [],
      }),
    ).toThrow();
  });
});

describe("MockLanguageProvider", () => {
  it("produce un análisis válido a partir de una transcripción", async () => {
    const provider = new MockLanguageProvider();
    const transcript =
      "Acordamos enviar el informe. La tarea principal es revisar el contrato. Existe un riesgo de retraso.";
    const result = await provider.analyze(transcript);
    expect(() => analysisSchema.parse(result)).not.toThrow();
    expect(result.summary.length).toBeGreaterThan(0);
  });
});
