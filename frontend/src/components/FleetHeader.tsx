import { getActiveFleetDetails, postInviteMember, postRenameFleet } from "../api/Methods";
import CharacterSeachSelect from "./CharacterSeachSelect";
import { EditFleetObjectCollapse } from "./structure/utils/EditFleetObjectCollapse";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Card from "react-bootstrap/Card";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Button from "react-bootstrap/esm/Button";
import Form from "react-bootstrap/esm/Form";
import { useParams } from "react-router-dom";

const FleetHeader = () => {
  const { fleetID } = useParams();
  const [character, setCharacter] = useState(0);
  const [fleetName, setFleetName] = useState("");

  const { data } = useQuery({
    queryKey: ["getActiveFleetDetails"],
    queryFn: async () => await getActiveFleetDetails(fleetID ? +fleetID : 0),
    refetchInterval: 6000,
  });

  return (
    <Card className="m-1 ">
      <Card.Body>
        <div className="d-flex align-items-center">
          {data ? (
            <>
              <h4 className="m-2 me-auto">{data.name}</h4>
              <EditFleetObjectCollapse variant={undefined} id={`edit-fleet`} icon={"fa-bars"}>
                <div className="d-flex flex-row me-2">
                  <Form.Control
                    size="sm"
                    type="text"
                    onChange={(e) => {
                      setFleetName(e.target.value);
                    }}
                    placeholder={"New Name"}
                    style={{ width: "250px" }}
                  />
                  <Button
                    className="me-2"
                    size={"sm"}
                    onClick={() => {
                      postRenameFleet(fleetID ? +fleetID : 0, fleetName);
                    }}
                  >
                    <i className={"fas fa-fw fa-arrow-up-right-from-square"}></i>
                  </Button>

                  <div className="m-0" style={{ width: "300px" }}>
                    <CharacterSeachSelect setCharacter={setCharacter} />
                  </div>
                  <OverlayTrigger
                    placement={"left"}
                    overlay={<Tooltip id={`tooltip-fleet-wing`}>Invite Character</Tooltip>}
                  >
                    <Button
                      className="me-2"
                      variant={"primary"}
                      size={"sm"}
                      onClick={() => {
                        postInviteMember(fleetID ? +fleetID : 0, character);
                      }}
                    >
                      <i className={`fas fa-fw fa-plus`}></i>
                    </Button>
                  </OverlayTrigger>
                </div>
              </EditFleetObjectCollapse>

              <OverlayTrigger
                placement={"left"}
                overlay={<Tooltip id={`tooltip-fleet-edit`}>Fleet is Editable?</Tooltip>}
              >
                <i
                  className={`mx-2 fas fa-fw fa-edit ${
                    data.editable ? "text-success" : "text-danger"
                  }`}
                />
              </OverlayTrigger>
              <OverlayTrigger
                placement={"left"}
                overlay={<Tooltip id={`tooltip-fleet-edit`}>Free Move Active?</Tooltip>}
              >
                <i
                  className={`mx-2 fas fa-fw fa-arrows-up-down-left-right ${
                    data.state?.is_free_move ? "text-success" : "text-danger"
                  }`}
                />
              </OverlayTrigger>
            </>
          ) : (
            <h4 className="me-auto">Loading...</h4>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default FleetHeader;
