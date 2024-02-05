import { getCatApi } from "../../api/Api";
import { components, operations } from "../../api/CatApi";
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
}

async function renameWing(fleetID: number, wingID: number, newName: string) {
  const { PUT } = getCatApi();

  const query: operations["aacat_api_rename_wing"]["parameters"]["query"] = {
    name: newName,
  };

  const { data, error } = await PUT("/cat/api/fleets/{fleet_id}/wing/{wing_id}", {
    params: {
      path: { fleet_id: fleetID, wing_id: wingID },
      query: query,
    },
  });

  if (error) {
    console.log(error);
  } else {
    console.log(data);
  }
}

async function addSquad(fleet_id: number, wingID: number) {
  const { POST } = getCatApi();

  const { data, error } = await POST("/cat/api/fleets/{fleet_id}/wing/{wing_id}/squad", {
    params: {
      path: { fleet_id: fleet_id, wing_id: wingID },
    },
  });

  if (error) {
    console.log(error);
  } else {
    console.log(data);
  }
}

async function delWing(fleet_id: number, wingID: number) {
  const { DELETE } = getCatApi();

  const { data, error } = await DELETE("/cat/api/fleets/{fleet_id}/wing/{wing_id}", {
    params: {
      path: { fleet_id: fleet_id, wing_id: wingID },
    },
  });

  if (error) {
    console.log(error);
  } else {
    console.log(data);
  }
}

export function FleetWing({ wing, updating }: WingProps) {
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
        </div>
      </div>
      <FleetDroppable id={`wing_commander-${id}`}>
        {wing.commander ? (
          <FleetMember
            character={wing.commander}
            updating={updating?.includes(wing.commander?.character.character_id)}
            icon="fa-star"
            index={0}
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
            return <FleetSquad squad={squad} wing_id={wing.wing_id} updating={updating} />;
          })
        ) : (
          <span>No Squads</span>
        )}
      </div>
    </div>
  );
}
