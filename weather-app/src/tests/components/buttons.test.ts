import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Button from "../../components/Button";
import SaveButton from "../../components/SaveButton";

function renderSave(props: { isSaved: boolean; disabled?: boolean }) {
  return renderToStaticMarkup(
    createElement(SaveButton, { ...props, onToggle: () => {} })
  );
}

describe("TC-UI-001 save button", () => {
  it("says Save with an outline star when the city is not a Favourite", () => {
    const html = renderSave({ isSaved: false });

    expect(html).toContain("<span>Save</span>");
    expect(html).toContain('fill="none"');
  });

  it("says Saved with a filled star once the city is a Favourite", () => {
    const html = renderSave({ isSaved: true });

    expect(html).toContain("<span>Saved</span>");
    expect(html).toContain('fill="currentColor"');
  });

  it("hides the star from screen readers so the label is read once", () => {
    expect(renderSave({ isSaved: false })).toContain('aria-hidden="true"');
  });

  it("is enabled by default", () => {
    expect(renderSave({ isSaved: false })).not.toContain("disabled");
  });

  it("is disabled while favourites are still loading", () => {
    expect(renderSave({ isSaved: false, disabled: true })).toContain("disabled");
  });

  it("is a plain button, so it never submits a surrounding form", () => {
    expect(renderSave({ isSaved: false })).toContain('type="button"');
  });
});

describe("TC-UI-002 button variants", () => {
  function renderButton(props: { variant?: "primary" | "secondary" | "ghost"; type?: "button" | "submit" }) {
    return renderToStaticMarkup(createElement(Button, { ...props, children: "Continue" }));
  }


  it("is secondary (outlined) unless told otherwise", () => {
    expect(renderButton({})).toContain('class="btn btn-secondary"');
  });

  it.each(["primary", "secondary", "ghost"] as const)(
    "applies the %s style",
    (variant) => {
      expect(renderButton({ variant })).toContain(`class="btn btn-${variant}"`);
    }
  );

  it("defaults to type button and allows submit when asked", () => {
    expect(renderButton({})).toContain('type="button"');
    expect(renderButton({ type: "submit" })).toContain('type="submit"');
  });

  it("shows the label", () => {
    expect(renderButton({})).toContain("<span>Continue</span>");
  });
});
