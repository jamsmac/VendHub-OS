import { describe, it, expect, jest } from "@jest/globals";
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
  ] as const)('renders variant "%s" without crash', (variant) => {
    render(<Button variant={variant}>{variant}</Button>);
    expect(screen.getByRole("button", { name: variant })).toBeInTheDocument();
  });

  // ── Sizes ──────────────────────────────────────────────────────────────────
  it.each(["default", "sm", "lg", "icon"] as const)(
    'renders size "%s" without crash',
    (size) => {
      render(<Button size={size}>Size {size}</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    },
  );

  // ── Disabled state ─────────────────────────────────────────────────────────
  it("is disabled when disabled=true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not fire onClick when disabled", async () => {
    const handler = jest.fn();
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
    const handler = jest.fn();
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
  it('accepts type="submit"', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it('accepts type="button"', () => {
    render(<Button type="button">Action</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
