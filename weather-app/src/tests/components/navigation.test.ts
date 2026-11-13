import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FavouriteLocations from "../../components/FavouriteLocations";
import FavouritesPanel from "../../components/FavouritesPanel";
import UnitToggle from "../../components/UnitToggle";

const LAGOS = { id: "lagos_ng", name: "Lagos, Nigeria", latitude: 6.52, longitude: 3.38 };
const ABUJA = { id: "abuja_ng", name: "Abuja, Nigeria", latitude: 9.08, longitude: 7.4 };

function renderList(props: {
  activeId?: string;
  unit?: "celsius" | "fahrenheit";
  weather?: Record<string, { temperature: number; weatherCode: number; isDay: boolean }>;
  favourites?: (typeof LAGOS)[];
}) {
  return renderToStaticMarkup(
    createElement(FavouriteLocations, {
      favourites: props.favourites ?? [LAGOS, ABUJA],
      activeId: props.activeId ?? "",
      temperatureUnit: props.unit ?? "celsius",
      weatherById: props.weather ?? {},
      onSelect: () => {},
      onRemove: () => {},
    })
  );
}

describe("TC-UI-005 Favourites list", () => {
  it("lists every Favourite by name", () => {
    const html = renderList({});

    expect(html).toContain("Lagos, Nigeria");
    expect(html).toContain("Abuja, Nigeria");
  });

  it("shows each Favourite's temperature in the chosen unit", () => {
    const weather = { lagos_ng: { temperature: 30, weatherCode: 3, isDay: true } };

    expect(renderList({ weather, unit: "celsius" })).toContain("30°C");
    expect(renderList({ weather, unit: "fahrenheit" })).toContain("86°F");
  });

  it("shows only the name while weather has not loaded", () => {
    expect(renderList({})).not.toContain("°");
  });

  it("marks the Favourite being viewed", () => {
    const html = renderList({ activeId: "abuja_ng" });

    expect(html).toContain('class="favourite active"');
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
  });

  it("gives each remove button a name that says which city it removes", () => {
    const html = renderList({});

    expect(html).toContain('aria-label="Remove Lagos, Nigeria from favourites"');
    expect(html).toContain('aria-label="Remove Abuja, Nigeria from favourites"');
  });

  it("explains how to add a Favourite when there are none", () => {
    expect(renderList({ favourites: [] })).toContain("No favourites yet");
  });
});

describe("TC-UI-006 Favourites panel for Guests", () => {
  function renderPanel(isGuest: boolean) {
    return renderToStaticMarkup(
      createElement(FavouritesPanel, {
        isGuest,
        favourites: isGuest ? [] : [LAGOS],
        error: "",
        activeId: "",
        temperatureUnit: "celsius",
        onSelect: () => {},
        onRemove: () => {},
        onRequestSignIn: () => {},
      })
    );
  }

  it("shows a Guest a sign-in prompt instead of a list", () => {
    const html = renderPanel(true);

    expect(html).toContain("Sign in to keep your favourite cities.");
    expect(html).toContain("<span>Sign in</span>");
    expect(html).not.toContain("favourites");
  });

  it("shows a signed-in user their list", () => {
    const html = renderPanel(false);

    expect(html).toContain("Lagos, Nigeria");
    expect(html).not.toContain("Sign in to keep");
  });
});

describe("TC-UI-007 unit switch", () => {
  function renderToggle(value: "celsius" | "fahrenheit") {
    return renderToStaticMarkup(createElement(UnitToggle, { value, onChange: () => {} }));
  }

  it("shows °C as the selected unit", () => {
    const html = renderToggle("celsius");

    expect(html).toMatch(/aria-pressed="true"[^>]*>°C</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>°F</);
  });

  it("shows °F as the selected unit", () => {
    const html = renderToggle("fahrenheit");

    expect(html).toMatch(/aria-pressed="false"[^>]*>°C</);
    expect(html).toMatch(/aria-pressed="true"[^>]*>°F</);
  });
});
