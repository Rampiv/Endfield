import { Character, Weapon } from "@/lib/types";
import "./ItemCard.scss";

interface Props {
  item: Character | Weapon;
  constellationOverride?: number;
}

export const ItemCard = ({ item, constellationOverride }: Props) => {
  // Используем переданную консту, либо ту, что в предмете, либо 0
  const constLevel =
    constellationOverride !== undefined
      ? constellationOverride
      : ((item as Character).constellation ?? 0);

  const isCharacter = "element" in item;

  return (
    <div className="character">
      {item.image ? (
        <img src={item.image} alt={item.name} className="character__image" />
      ) : (
        <p>Изображение не найдено</p>
      )}

      <p className="character__name">{item.name}</p>

      <p className="character__const">C{constLevel ?? 0}</p>
    </div>
  );
};
