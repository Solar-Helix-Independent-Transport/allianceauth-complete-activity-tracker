import { getFleetComp, ShipCount } from "../../api/Methods";
import { useFleetId } from "../../hooks/useFleetId";
import { useQuery } from "@tanstack/react-query";
import Card from "react-bootstrap/Card";
import Spinner from "react-bootstrap/Spinner";

const FleetComp = () => {
  const fleetId = useFleetId();

  const { data, isPending } = useQuery({
    queryKey: ["getFleetComp", fleetId],
    queryFn: async () => await getFleetComp(fleetId),
    refetchInterval: 5000,
  });

  if (isPending) {
    return (
      <Card className="m-1 flex-fill">
        <Card.Body>
          <Card.Title>Fleet Composition</Card.Title>
          <hr />
          <Spinner animation="border" />
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="m-1 flex-fill">
      <Card.Body>
        <Card.Title>Fleet Composition</Card.Title>
        <hr />
        {data?.map((ship: ShipCount) => (
          <Card.Text key={ship.name}>
            <div className="d-flex flex-row justify-content-between">
              <span>{ship.name}</span>
              <span>{ship.count}</span>
            </div>
          </Card.Text>
        ))}
      </Card.Body>
    </Card>
  );
};

export default FleetComp;
