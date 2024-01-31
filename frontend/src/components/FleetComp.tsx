import { Cat } from "../api/Cat";
import { useQuery } from "@tanstack/react-query";
import cookies from "js-cookies";
import Card from "react-bootstrap/Card";
import { useParams } from "react-router-dom";

const getFleetComp = async (fleetID: number) => {
  console.log("getFleetComp");
  const api = new Cat();
  const response = await api.aacatApiGetFleetStats(fleetID, {
    headers: { "X-Csrftoken": cookies.getItem("csrftoken") },
  });
  console.log(response);

  return response.data;
};

const FleetComp = () => {
  const { fleetID } = useParams();

  const { data } = useQuery({
    queryKey: ["getFleetComp", fleetID],
    queryFn: async () => await getFleetComp(+fleetID),
    refetchInterval: 5000,
  });

  console.log(data);
  return (
    <Card className="m-4 flex-fill">
      <Card.Body>
        <Card.Title>Fleet Comp</Card.Title>
        <hr />
        {data?.map((ship: unknown) => {
          return (
            <Card.Text>
              <div className="d-flex flex-row justify-content-between">
                <span>{ship.name}</span>
                <span>{ship.count}</span>
              </div>
            </Card.Text>
          );
        })}
      </Card.Body>
    </Card>
  );
};

export default FleetComp;
