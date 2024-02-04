import { getCatApi } from "../api/Api";
import { Fleet } from "../components/structure/FleetStructure";
import { useQuery } from "@tanstack/react-query";
import Card from "react-bootstrap/Card";
import { useParams } from "react-router-dom";

async function getFleetStructure(fleetID: number) {
  const { GET } = getCatApi();

  const { data, error } = await GET("/cat/api/fleets/{fleet_id}/structure", {
    params: {
      path: { fleet_id: fleetID },
    },
  });
  if (error) {
    console.log(error);
  } else {
    console.log("COMP:", data);
    return data;
  }
}

const FleetStructure = () => {
  const { fleetID } = useParams();
  const { data } = useQuery({
    queryKey: ["getFleetStructure", fleetID],
    queryFn: async () => await getFleetStructure(fleetID ? +fleetID : 0),
    refetchInterval: 5000,
  });

  // Fleet > Wing > Squad > People
  // Command available at each level
  return (
    <Card className="w-100">
      <Card.Body>{data && <Fleet fleet={data} />}</Card.Body>
    </Card>
  );
};

export default FleetStructure;
