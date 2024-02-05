import { getCatApi } from "../../api/Api";
import { components, operations } from "../../api/CatApi";
import { FleetMember } from "./FleetMember";
import { EditFleetObject } from "./utils/EditFleetObject";
import { FleetDroppable } from "./utils/FleetDroppable";
import { useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useParams } from "react-router-dom";

export declare interface SquadProps {
  wing_id: number;
  squad: components["schemas"]["FleetSquad"];
  updating?: Array<number>;
}

async function renameSquad(fleetID: number, squadID: number, newName: string) {
  const { PUT } = getCatApi();

  const query: operations["aacat_api_rename_squad"]["parameters"]["query"] = {
    name: newName,
  };

  const { data, error } = await PUT("/cat/api/fleets/{fleet_id}/squad/{squad_id}", {
    params: {
      path: { fleet_id: fleetID, squad_id: squadID },
      query: query,
    },
  });

  if (error) {
    console.log(error);
  } else {
    console.log(data);
  }
}

export function FleetSquad({ squad, wing_id, updating }: SquadProps) {
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
          <EditFleetObject id={`edit-${id}`} icon={"fa-bars"}>
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
            </div>
          </EditFleetObject>
        </div>
      </div>
      <FleetDroppable id={`squad_commander-${id}`}>
        {squad.commander ? (
          <FleetMember
            character={squad.commander}
            updating={updating?.includes(squad.commander?.character.character_id)}
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
        <FleetDroppable id={`squad_member-${id}`}>
          {squad.characters?.length ? (
            squad.characters.map(
              (char: components["schemas"]["SnapshotCharacter"], index: number) => {
                return (
                  <FleetMember
                    character={char}
                    index={index}
                    updating={updating?.includes(char.character.character_id)}
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
