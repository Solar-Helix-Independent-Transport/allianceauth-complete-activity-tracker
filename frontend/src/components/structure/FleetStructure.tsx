import { components } from "../../api/CatApi";
import { FleetMember } from "./FleetMember";
import { FleetWing } from "./FleetWing";

export declare interface WingProps {
  fleet: components["schemas"]["FleetStructure"];
}

export function Fleet({ fleet }: WingProps) {
  return (
    <div className="d-flex flex-column" key={`fleet`}>
      {fleet.commander && (
        <>
          <FleetMember character={fleet.commander} icon="fa-star" />
          <hr />
        </>
      )}
      <div className="ms-4">
        {fleet.wings?.map((wing: components["schemas"]["FleetWing"]) => {
          return <FleetWing wing={wing} />;
        })}
      </div>
    </div>
  );
}
