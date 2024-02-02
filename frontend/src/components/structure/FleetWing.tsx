import { components } from "../../api/CatApi";
import { FleetMember } from "./FleetMember";
import { FleetSquad } from "./FleetSquad";

export declare interface WingProps {
  wing: components["schemas"]["FleetWing"];
}

export function FleetWing({ wing }: WingProps) {
  return (
    <div className="d-flex flex-column" key={`squad${wing.wing_id}`}>
      <h5>{wing.name}</h5>
      <hr />
      {wing.commander && (
        <>
          <FleetMember character={wing.commander} icon="fa-star" />
          <hr />
        </>
      )}
      <div className="ms-4">
        {wing.squads?.map((squad: components["schemas"]["FleetSquad"]) => {
          return <FleetSquad squad={squad} />;
        })}
      </div>
    </div>
  );
}
