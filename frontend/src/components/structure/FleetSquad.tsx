import { components } from "../../api/CatApi";
import { FleetMember } from "./FleetMember";

export declare interface SquadProps {
  squad: components["schemas"]["FleetSquad"];
}

export function FleetSquad({ squad }: SquadProps) {
  return (
    <div className="d-flex flex-column" key={`squad${squad.squad_id}`}>
      <h5>{squad.name}</h5>
      <hr />
      {squad.commander && (
        <>
          <FleetMember character={squad.commander} icon="fa-star" />
          <hr />
        </>
      )}
      <div className="ms-4">
        {squad.characters?.map((char: components["schemas"]["SnapshotCharacter"]) => {
          return <FleetMember character={char} />;
        })}
      </div>
    </div>
  );
}
