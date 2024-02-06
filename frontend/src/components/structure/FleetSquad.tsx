import { components } from "../../api/CatApi";
import { delSquad, renameSquad } from "../../api/Methods";
import { FleetMember } from "./FleetMember";
import { EditFleetObjectCollapse } from "./utils/EditFleetObjectCollapse";
import { FleetDroppable } from "./utils/FleetDroppable";
import { useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/esm/OverlayTrigger";
import Tooltip from "react-bootstrap/esm/Tooltip";
import { useParams } from "react-router-dom";

export declare interface SquadProps {
  wing_id: number;
  squad: components["schemas"]["FleetSquad"];
  updating?: Array<number>;
  editable?: boolean;
}

export function FleetSquad({ squad, wing_id, updating, editable }: SquadProps) {
  const id = `${wing_id}-${squad.squad_id}`;
  const [newName, setName] = useState<string>(squad.name ? squad.name : "Unknown");
  const { fleetID } = useParams();

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
        <div className="ms-auto">
          {editable && (
            <EditFleetObjectCollapse id={`edit-${id}`} icon={"fa-bars"}>
              <div className="d-flex flex-row mx-2">
                <Form.Control
                  size="sm"
                  type="text"
                  onChange={(e) => setName(e.target.value)}
                  placeholder={"New Name"}
                />
                <Button
                  variant={newName == squad.name ? "success" : "warning"}
                  size={"sm"}
                  onClick={() => {
                    renameSquad(fleetID ? +fleetID : 0, squad.squad_id, newName);
                  }}
                >
                  <i
                    className={`fas ${
                      newName == squad.name ? "fa-check" : "fa-arrow-up-right-from-square"
                    }`}
                  ></i>
                </Button>
                {!memberCount && (
                  <OverlayTrigger
                    placement={"left"}
                    overlay={<Tooltip id={`tooltip-warp-${id}`}>Delete Squad</Tooltip>}
                  >
                    <Button
                      className="ms-2"
                      variant={"danger"}
                      size={"sm"}
                      onClick={() => {
                        delSquad(fleetID ? +fleetID : 0, squad.squad_id);
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
      <FleetDroppable id={`squad_commander-${id}`}>
        {squad.commander ? (
          <FleetMember
            character={squad.commander}
            updating={updating?.includes(squad.commander?.character.character_id)}
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
        <FleetDroppable id={`squad_member-${id}`}>
          {squad.characters?.length ? (
            squad.characters.map(
              (char: components["schemas"]["SnapshotCharacter"], index: number) => {
                return (
                  <FleetMember
                    character={char}
                    index={index}
                    updating={updating?.includes(char.character.character_id)}
                    editable={editable}
                  />
                );
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
