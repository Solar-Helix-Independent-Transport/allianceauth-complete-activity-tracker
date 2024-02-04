import { components } from "../../api/CatApi";
import { FleetDroppable } from "./FleetDroppable";
import { FleetMember } from "./FleetMember";

export declare interface SquadProps {
  wing_id: number;
  squad: components["schemas"]["FleetSquad"];
}

export function FleetSquad({ squad, wing_id }: SquadProps) {
  const id = `${wing_id}-${squad.squad_id}`;
  let memberCount = squad.characters ? squad.characters.length : 0;
  if (squad.commander) {
    memberCount = memberCount + 1;
  }
  return (
    <div className="d-flex flex-column my-2" key={id}>
      <div className="d-flex flex-row align-items-center border-bottom" key={id}>
        <h5 className="m-1">{squad.name}</h5>
        <span className={`m-1 badge bg-${memberCount ? "info" : "secondary"}`}>
          {memberCount ? `${memberCount}` : "Empty"}
        </span>
      </div>
      <FleetDroppable id={`squad_commander-${id}`}>
        {squad.commander ? (
          <FleetMember character={squad.commander} icon="fa-star" index={0} />
        ) : (
          <span>
            <i className={`mx-1 fas fa-fw fa-star`}></i> No Commander
          </span>
        )}
      </FleetDroppable>
      <div className="ms-4">
        <FleetDroppable id={`squad_member-${id}`}>
          {squad.characters?.length ? (
            squad.characters.map(
              (char: components["schemas"]["SnapshotCharacter"], index: number) => {
                return <FleetMember character={char} index={index} />;
              }
            )
          ) : (
            <span className="">
              <i className="far fa-fw fa-question"></i>No Members
            </span>
          )}
        </FleetDroppable>
      </div>
    </div>
  );
}
