import { components } from "../../api/CatApi";
import { FleetDroppable } from "./FleetDroppable";
import { FleetMember } from "./FleetMember";
import { FleetSquad } from "./FleetSquad";

export declare interface WingProps {
  wing: components["schemas"]["FleetWing"];
}

export function FleetWing({ wing }: WingProps) {
  const id = `${wing.wing_id}`;
  const squadCounts = wing.squads?.reduce((_p, squad) => {
    let sqmCount = squad.characters ? squad.characters.length : 0;
    if (squad.commander) {
      sqmCount = sqmCount + 1;
    }
    return sqmCount;
  }, 0);
  let memberCount = 0;
  if (squadCounts) {
    memberCount = squadCounts;
  }
  if (wing.commander) {
    memberCount = memberCount + 1;
  }

  return (
    <div className="d-flex flex-column my-2" key={`squad${wing.wing_id}`}>
      <div className="d-flex flex-row align-items-center border-bottom" key={id}>
        <h5 className="m-1">{wing.name}</h5>
        <span className={`m-1 badge bg-${memberCount ? "info" : "secondary"}`}>
          {memberCount ? `${memberCount}` : "Empty"}
        </span>
      </div>
      <FleetDroppable id={`wing_commander-${id}`}>
        {wing.commander ? (
          <FleetMember character={wing.commander} icon="fa-star" index={0} />
        ) : (
          <span>
            <i className={`mx-1 fas fa-fw fa-star`}></i> No Commander
          </span>
        )}
      </FleetDroppable>
      <div className="ms-4">
        {wing.squads?.length ? (
          wing.squads.map((squad: components["schemas"]["FleetSquad"]) => {
            return <FleetSquad squad={squad} wing_id={wing.wing_id} />;
          })
        ) : (
          <span>No Squads</span>
        )}
      </div>
    </div>
  );
}
