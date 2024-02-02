// @ts-nocheck
import { Cat } from "../../api/Cat";
import { useQuery } from "@tanstack/react-query";
import Cookies from "js-cookie";
import Card from "react-bootstrap/Card";
import { useParams } from "react-router-dom";

const getFleetCharacterChanges = async (fleetID: number) => {
  console.log("getFleetComp");
  const api = new Cat();
  const response = await api.aacatApiGetFleetCharacterChanges(fleetID, {
    headers: { "X-Csrftoken": cookies.get("csrftoken") },
  });
  console.log(response);

  return response.data;
};

const FleetCharacters = () => {
  const { fleetID } = useParams();

  const { data } = useQuery({
    queryKey: ["getFleetCharacterChanges", fleetID],
    queryFn: async () => await getFleetCharacterChanges(+fleetID),
    refetchInterval: 5000,
  });

  return (
    <>
      <Card className="m-4 flex-fill">
        <Card.Body>
          <Card.Title>Current</Card.Title>
          <hr />
          {data?.current?.map((char: unknown) => {
            return (
              <Card.Text>
                <div className="d-flex flex-row justify-content-between">
                  <span>{char.name}</span>
                  <span>
                    {char.count}/{data.total_events}
                  </span>
                </div>
              </Card.Text>
            );
          })}
        </Card.Body>
      </Card>
      <Card className="m-4 flex-fill">
        <Card.Body>
          <Card.Title>Joiners</Card.Title>
          <hr />
          {data?.joiners?.map((char: unknown) => {
            return (
              <Card.Text>
                <div className="d-flex flex-row justify-content-between">
                  <span>{char.name}</span>
                  <span>
                    {char.count}/{data.total_events}
                  </span>
                </div>
              </Card.Text>
            );
          })}
        </Card.Body>
      </Card>
      <Card className="m-4 flex-fill">
        <Card.Body>
          <Card.Title>Leavers</Card.Title>
          <hr />
          {data?.leavers?.map((char: unknown) => {
            return (
              <Card.Text>
                <div className="d-flex flex-row justify-content-between">
                  <span>{char.name}</span>
                  <span>
                    {char.count}/{data.total_events}
                  </span>
                </div>
              </Card.Text>
            );
          })}
        </Card.Body>
      </Card>
    </>
  );
};

export default FleetCharacters;
