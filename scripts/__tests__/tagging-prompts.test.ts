import { describe, expect, it } from "vitest";
import {
  buildUserPrompt,
  createStationBatches,
  getSystemPrompt,
  getTaggingProfileId,
} from "../tagging-prompts.mjs";

describe("tagging-prompts", () => {
  it("maps comedy stations to the sketch profile", () => {
    expect(getTaggingProfileId("snl")).toBe("sketch");
    expect(getTaggingProfileId("comedy")).toBe("sketch");
    expect(getTaggingProfileId("science")).toBe("topics");
  });

  it("uses station-specific system prompts", () => {
    expect(getSystemPrompt("snl")).toContain("Kate McKinnon");
    expect(getSystemPrompt("science")).toContain("black holes");
    expect(getSystemPrompt("science")).not.toContain("Kate McKinnon");
  });

  it("builds user prompts from title and description", () => {
    const prompt = buildUserPrompt([
      { title: "Black Jeopardy", description: "Tom Hanks hosts a sketch." },
    ]);
    expect(prompt).toBe("1. Black Jeopardy — Tom Hanks hosts a sketch.");
  });

  it("groups batches by station so each batch shares one prompt", () => {
    const batches = createStationBatches(
      [
        { stationId: "snl", video: { id: "a", title: "A" } },
        { stationId: "snl", video: { id: "b", title: "B" } },
        { stationId: "science", video: { id: "c", title: "C" } },
      ],
      2,
    );

    expect(batches).toHaveLength(2);
    expect(batches[0]).toEqual({
      stationId: "snl",
      videos: [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
    });
    expect(batches[1]).toEqual({
      stationId: "science",
      videos: [{ id: "c", title: "C" }],
    });
  });
});
