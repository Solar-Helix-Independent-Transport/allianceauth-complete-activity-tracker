import { getActiveFleetDetails, postInviteMember, postRenameFleet } from "../api/Methods";
import { useFleetId } from "../hooks/useFleetId";
import CharacterSeachSelect from "./CharacterSeachSelect";
import { EditFleetObjectCollapse } from "./structure/utils/EditFleetObjectCollapse";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Card from "react-bootstrap/Card";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Button from "react-bootstrap/esm/Button";
import Form from "react-bootstrap/esm/Form";

const FleetHeader = () => {
  const fleetId = useFleetId();
  const queryClient = useQueryClient();
  const [character, setCharacter] = useState(0);
  const [fleetName, setFleetName] = useState("");

  const { data } = useQuery({
    queryKey: ["getActiveFleetDetails", fleetId],
    queryFn: async () => await getActiveFleetDetails(fleetId),
    refetchInterval: 5000,
  });

  const renameMutation = useMutation({
    mutationFn: () => postRenameFleet(fleetId, fleetName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getActiveFleetDetails", fleetId] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () => postInviteMember(fleetId, character),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getFleetStructure", fleetId] });
    },
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
                    onChange={(e) => setFleetName(e.target.value)}
                    placeholder={"New Name"}
                    style={{ width: "250px" }}
                  />
                  <Button
                    className="me-2"
                    size={"sm"}
                    disabled={renameMutation.isPending}
                    variant={renameMutation.isError ? "danger" : undefined}
                    onClick={() => renameMutation.mutate()}
                  >
                    <i
                      className={`fas fa-fw ${
                        renameMutation.isPending
                          ? "fa-spinner fa-spin"
                          : "fa-arrow-up-right-from-square"
                      }`}
                    ></i>
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
                      variant={inviteMutation.isError ? "danger" : "primary"}
                      size={"sm"}
                      disabled={inviteMutation.isPending}
                      onClick={() => inviteMutation.mutate()}
                    >
                      <i
                        className={`fas fa-fw ${
                          inviteMutation.isPending ? "fa-spinner fa-spin" : "fa-plus"
                        }`}
                      ></i>
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
                overlay={<Tooltip id={`tooltip-fleet-free-move`}>Free Move Active?</Tooltip>}
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
