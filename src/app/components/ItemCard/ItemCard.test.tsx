import { Character } from "@/lib/types";
import { render, screen } from "@testing-library/react";
import { ItemCard } from "./ItemCard";

const mockCharacter: Character = {
  id: "123",
  name: "Эндминистратор",
  element: "physical",
  rarity: "6",
  image: "https://example.com/img.png",
  constellation: 2,
};

describe("ItemCard компонент", () => {
  it("Имя", () => {
    render(<ItemCard item={mockCharacter} />);
    expect(screen.getByText("Эндминистратор")).toBeInTheDocument();
  });
  it("Конста изначальная", () => {
    render(<ItemCard item={mockCharacter} />);
    expect(screen.getByText(/C2/i)).toBeInTheDocument();
  });

  it("Переопределенная конста", () => {
    render(<ItemCard item={mockCharacter} constellationOverride={5} />);

    expect(screen.getByText(/C5/i)).toBeInTheDocument();
    expect(screen.queryByText(/C2/i)).not.toBeInTheDocument();
  });

  it("Заглушка вместо картинки", () => {
    const charNoImg = { ...mockCharacter, image: "" };
    render(<ItemCard item={charNoImg} />);

    expect(screen.getByText(/изображение не найдено/i)).toBeInTheDocument();
  });
});
