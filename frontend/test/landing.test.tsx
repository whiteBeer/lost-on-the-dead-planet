import { render, screen } from "@testing-library/react";
import Page from "../src/app/page";
import "@testing-library/jest-dom";

// Mock useRouter
jest.mock("next/navigation", () => ({
    useRouter() {
        return {
            push: jest.fn()
        };
    }
}));

describe("Page", () => {
    it("renders menu text", () => {
        render(<Page />);
        const menuText = screen.getByText("Lost on the Dead Planet");
        expect(menuText).toBeInTheDocument();
    });

    it("renders Join Game button", () => {
        render(<Page />);
        const button = screen.getByText("Join game");
        expect(button).toBeInTheDocument();
    });

    it("renders Create Game button", () => {
        render(<Page />);
        const button = screen.getByText("Create game");
        expect(button).toBeInTheDocument();
    });
});