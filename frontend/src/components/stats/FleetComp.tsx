/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCatApi } from "../../api/Api";
import { useQuery } from "@tanstack/react-query";
import Card from "react-bootstrap/Card";
import { useParams } from "react-router-dom";

const getFleetComp = async (fleetID: number) => {
  // console.log("getFleetComp");
  const { GET } = getCatApi();

  const { data, error } = await GET("/cat/api/fleets/{fleet_id}/stats", {
    params: {
      path: { fleet_id: fleetID },
    },
  });
  if (data) {
    return data;
  } else {
    console.log(error);
    return [];
  }
};

const FleetComp = () => {
  const { fleetID } = useParams();

  const { data } = useQuery({
    queryKey: ["getFleetComp", fleetID],
    queryFn: async () => await getFleetComp(fleetID ? +fleetID : 0),
    refetchInterval: 5000,
  });

  console.log(data);
  return (
    <Card className="m-1 flex-fill">
      <Card.Body>
        <Card.Title>Fleet Composition</Card.Title>
        <hr />
        {data?.map((ship: any) => {
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
