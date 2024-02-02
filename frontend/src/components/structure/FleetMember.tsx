import { components } from "../../api/CatApi";

export declare interface FleetMemberProps {
  character: components["schemas"]["SnapshotCharacter"];
  icon?: string;
}

export function FleetMember({ character, icon }: FleetMemberProps) {
  return (
    <div className="d-flex align-items-center" key={`panel ${character.character.character_name}`}>
      {icon && (
        <span>
          <i className={`mx-1 fas fa-fw ${icon}`}></i>
        </span>
      )}
      <img
        src={`https://images.evetech.net/characters/${character.character.character_id}/portrait?size=32`}
      />
      <img src={`https://images.evetech.net/types/${character.ship.id}/icon?size=32`} />
      <h5 className="m-0 mx-2">{character.character.character_name}</h5>
      <span>({character.ship.name})</span>
      <span className="ms-auto">{character.system.name}</span>
      <span>({character.distance})</span>
    </div>
  );
}
