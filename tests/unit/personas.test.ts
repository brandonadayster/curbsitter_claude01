import { describe, expect, it } from "vitest";

import { resolvePersona } from "@/lib/personas";
import type { PropertyType, ServingWho } from "@/lib/personas";

describe("resolvePersona", () => {
  it("returns the HOA board persona when servingWho is hoa_community, regardless of property type", () => {
    expect(resolvePersona("hoa_community", "single_family").id).toBe("hoa_board");
    expect(resolvePersona("hoa_community", "vacation_rental").id).toBe("hoa_board");
    expect(resolvePersona("hoa_community", null).id).toBe("hoa_board");
  });

  it("returns the HOA board persona when propertyType is hoa_community, overriding servingWho", () => {
    expect(resolvePersona("myself", "hoa_community").id).toBe("hoa_board");
    expect(resolvePersona("family_member", "hoa_community").id).toBe("hoa_board");
    expect(resolvePersona("tenants_or_guests", "hoa_community").id).toBe("hoa_board");
    expect(resolvePersona(null, "hoa_community").id).toBe("hoa_board");
  });

  it("returns the caregiver persona for family_member regardless of property type", () => {
    expect(resolvePersona("family_member", "single_family").id).toBe("caregiver");
    expect(resolvePersona("family_member", "condo_townhome").id).toBe("caregiver");
    expect(resolvePersona("family_member", "vacation_rental").id).toBe("caregiver");
    expect(resolvePersona("family_member", "second_home").id).toBe("caregiver");
    expect(resolvePersona("family_member", null).id).toBe("caregiver");
  });

  it("returns the rental operator persona for tenants_or_guests regardless of property type", () => {
    expect(resolvePersona("tenants_or_guests", "single_family").id).toBe("rental_operator");
    expect(resolvePersona("tenants_or_guests", "second_home").id).toBe("rental_operator");
    expect(resolvePersona("tenants_or_guests", null).id).toBe("rental_operator");
  });

  it("refines myself by vacation rental into the rental operator persona", () => {
    expect(resolvePersona("myself", "vacation_rental").id).toBe("rental_operator");
  });

  it("refines myself by second home into the remote owner persona", () => {
    expect(resolvePersona("myself", "second_home").id).toBe("remote_owner");
  });

  it("falls back to the resident persona for myself on an ordinary property", () => {
    expect(resolvePersona("myself", "single_family").id).toBe("resident");
    expect(resolvePersona("myself", "condo_townhome").id).toBe("resident");
    expect(resolvePersona("myself", null).id).toBe("resident");
  });

  it("applies the same property-type refinement before servingWho has been answered", () => {
    expect(resolvePersona(null, "vacation_rental").id).toBe("rental_operator");
    expect(resolvePersona(null, "second_home").id).toBe("remote_owner");
    expect(resolvePersona(null, "single_family").id).toBe("resident");
  });

  it("defaults to the resident persona when neither question has been answered yet", () => {
    expect(resolvePersona(null, null).id).toBe("resident");
  });

  it("returns non-empty headline, benefits, and FAQ content for every reachable persona", () => {
    const combos: Array<[ServingWho | null, PropertyType | null]> = [
      ["hoa_community", null],
      ["family_member", null],
      ["tenants_or_guests", null],
      ["myself", "vacation_rental"],
      ["myself", "second_home"],
      ["myself", "single_family"],
    ];
    const seenIds = new Set<string>();
    for (const [servingWho, propertyType] of combos) {
      const persona = resolvePersona(servingWho, propertyType);
      seenIds.add(persona.id);
      expect(persona.headline.length).toBeGreaterThan(0);
      expect(persona.benefits.length).toBeGreaterThan(0);
      expect(persona.faqs.length).toBeGreaterThan(0);
      for (const faq of persona.faqs) {
        expect(faq.q.length).toBeGreaterThan(0);
        expect(faq.a.length).toBeGreaterThan(0);
      }
    }
    // All five personas are reachable, not just a subset.
    expect(seenIds).toEqual(
      new Set(["hoa_board", "caregiver", "rental_operator", "remote_owner", "resident"]),
    );
  });
});
