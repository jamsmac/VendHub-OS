import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  // ── Rendering ──────────────────────────────────────────────────────────────
  it("renders with default props", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: /click me/i });
    expect(btn).toBeInTheDocument();
  });

  it("has correct displayName", () => {
    expect(Button.displayName).toBe("Button");
  });

  // ── Variants ───────────────────────────────────────────────────────────────
  it.each([
    "default",
    "destructive",
    "outline",
    "secondary",
    "ghost",
    "link",
    "coffee",
  ] as const)('renders variant "%s" without crash', (variant) => {
    render(<Button variant={variant}>{variant}</Button>);
    expect(screen.getByRole("button", { name: variant })).toBeInTheDocument();
  });

  // ── Sizes ──────────────────────────────────────────────────────────────────
  it.each(["default", "sm", "lg", "xl", "icon"] as const)(
    'renders size "%s" without crash',
    (size) => {
      render(<Button size={size}>Size {size}</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    },
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  it("shows loading spinner when loading=true", () => {
    render(<Button loading>Save</Button>);
    // The button should show "Loading..." text
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("is disabled when loading=true", () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not fire onClick when loading", async () => {
    const handler = vi.fn();
    const user = userEvent.setup();
    render(
      <Button loading onClick={handler}>
        Save
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(handler).not.toHaveBeenCalled();
  });

  // ── Disabled state ─────────────────────────────────────────────────────────
  it("is disabled when disabled=true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not fire onClick when disabled", async () => {
    const handler = vi.fn();
    const user = userEvent.setup();
    render(
      <Button disabled onClick={handler}>
        Disabled
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(handler).not.toHaveBeenCalled();
  });

  // ── Click handling ─────────────────────────────────────────────────────────
  it("calls onClick when clicked", async () => {
    const handler = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handler}>Click me</Button>);
    await user.click(screen.getByRole("button", { name: /click me/i }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // ── className forwarding ───────────────────────────────────────────────────
  it("applies custom className", () => {
    render(<Button className="my-custom-class">Styled</Button>);
    expect(screen.getByRole("button")).toHaveClass("my-custom-class");
  });

  // ── asChild ────────────────────────────────────────────────────────────────
  it("renders as child element when asChild=true", () => {
    render(
      <Button asChild>
        <a href="/home">Home</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: /home/i });
    expect(link).toBeInTheDocument();
    expect(link.tagName.toLowerCase()).toBe("a");
  });

  // ── type attribute ─────────────────────────────────────────────────────────
  it('defaults to type="button"', () => {
    render(<Button>Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it('accepts type="submit"', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});
