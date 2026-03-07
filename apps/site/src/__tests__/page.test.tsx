import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "../app/page";

describe("LandingPage", () => {
  it("renders without crashing", () => {
    render(<LandingPage />);
    expect(document.querySelector("main")).toBeInTheDocument();
  });

  it("renders navigation bar", () => {
    render(<LandingPage />);
    expect(document.querySelector("nav")).toBeInTheDocument();
  });

  it("renders brand name", () => {
    render(<LandingPage />);
    const brands = screen.getAllByText("VendHub");
    expect(brands.length).toBeGreaterThanOrEqual(1);
  });

  it("renders navigation links", () => {
    render(<LandingPage />);
    const features = screen.getAllByText("Возможности");
    expect(features.length).toBeGreaterThanOrEqual(1);
    const modules = screen.getAllByText("Модули");
    expect(modules.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Hero section", () => {
    render(<LandingPage />);
    const headlines = screen.getAllByText(/Управляйте вендинговым/i);
    expect(headlines.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Features section", () => {
    render(<LandingPage />);
    const features = screen.getAllByText(/Всё для вендинга/i);
    expect(features.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Pricing section", () => {
    render(<LandingPage />);
    const pricing = screen.getAllByText(/прозрачные тарифы/i);
    expect(pricing.length).toBeGreaterThanOrEqual(1);
  });

  it("has CTA buttons", () => {
    render(<LandingPage />);
    const cta = screen.getAllByText(/Попробовать/);
    expect(cta.length).toBeGreaterThanOrEqual(1);
  });

  it("renders footer", () => {
    render(<LandingPage />);
    expect(document.querySelector("footer")).toBeInTheDocument();
  });
});
