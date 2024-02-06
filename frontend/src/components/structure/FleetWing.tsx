import { components } from "../../api/CatApi";
import { addSquad, delWing, renameWing } from "../../api/Methods";
import { FleetMember } from "./FleetMember";
import { FleetSquad } from "./FleetSquad";
import { EditFleetObjectCollapse } from "./utils/EditFleetObjectCollapse";
import { FleetDroppable } from "./utils/FleetDroppable";
import { useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/esm/OverlayTrigger";
import Tooltip from "react-bootstrap/esm/Tooltip";
import { useParams } from "react-router-dom";

export declare interface WingProps {
  wing: components["schemas"]["FleetWing"];
  updating?: Array<number>;
  editable?: boolean;
}

export function FleetWing({ wing, updating, editable }: WingProps) {
  const id = `${wing.wing_id}`;
  const [newName, setName] = useState<string>(wing.name ? wing.name : "Unknown");
  const { fleetID } = useParams();

  const squadCounts = wing.squads?.reduce((p, squad) => {
    let sqmCount = squad.characters ? squad.characters.length : 0;
    if (squad.commander) {
      sqmCount = sqmCount + 1;
    }
    return p + sqmCount;
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
        <div className="ms-auto">
          {editable && (
            <EditFleetObjectCollapse id={`edit-${id}`} icon={"fa-bars"}>
              <div className="d-flex align-items-center flex-row mx-2">
                <Form.Control
                  size="sm"
                  type="text"
                  onChange={(e) => setName(e.target.value)}
                  placeholder={"New Name"}
                />
                <Button
                  variant={newName == wing.name ? "success" : "warning"}
                  size={"sm"}
                  onClick={() => {
                    renameWing(fleetID ? +fleetID : 0, wing.wing_id, newName);
                  }}
                >
                  <i
                    className={`fas ${
                      newName == wing.name ? "fa-check" : "fa-arrow-up-right-from-square"
                    }`}
                  ></i>
                </Button>
                <OverlayTrigger
                  placement={"left"}
                  overlay={<Tooltip id={`tooltip-warp-${id}`}>Add Squad</Tooltip>}
                >
                  <Button
                    className="ms-2"
                    variant={""}
                    size={"sm"}
                    onClick={() => {
                      addSquad(fleetID ? +fleetID : 0, wing.wing_id);
                    }}
                  >
                    <i className={`fas fa-plus`}></i>
                  </Button>
                </OverlayTrigger>
                {!memberCount && (
                  <OverlayTrigger
                    placement={"left"}
                    overlay={<Tooltip id={`tooltip-warp-${id}`}>Delete Wing</Tooltip>}
                  >
                    <Button
                      className="ms-2"
                      variant={"danger"}
                      size={"sm"}
                      onClick={() => {
                        delWing(fleetID ? +fleetID : 0, wing.wing_id);
                      }}
                    >
                      <i className={`fas fa-trash`}></i>
                    </Button>
                  </OverlayTrigger>
                )}
              </div>
            </EditFleetObjectCollapse>
          )}
        </div>
      </div>
      <FleetDroppable id={`wing_commander-${id}`}>
        {wing.commander ? (
          <FleetMember
            character={wing.commander}
            updating={updating?.includes(wing.commander?.character.character_id)}
            icon="fa-star"
            index={0}
            editable={editable}
          />
        ) : (
          <span>
            <i className={`mx-1 fas fa-fw fa-star`}></i> No Commander
          </span>
        )}
      </FleetDroppable>
      <div className="ms-4">
        {wing.squads?.length ? (
          wing.squads.map((squad: components["schemas"]["FleetSquad"]) => {
            return (
              <FleetSquad
                squad={squad}
                wing_id={wing.wing_id}
                updating={updating}
                editable={editable}
              />
            );
          })
        ) : (
          <span>No Squads</span>
        )}
      </div>
    </div>
  );
}
