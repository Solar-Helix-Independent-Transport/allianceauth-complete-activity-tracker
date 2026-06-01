import { components } from "../../api/CatApi";
import { getActiveFleetList } from "../../api/Methods";
import CloseFleetButton from "../buttons/CloseFleet";
import { useQuery } from "@tanstack/react-query";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Spinner from "react-bootstrap/Spinner";
import { LinkContainer } from "react-router-bootstrap";

const ActiveFleetList = () => {
  const { data, isPending } = useQuery({
    queryKey: ["getActiveFleetList"],
    queryFn: async () => await getActiveFleetList(),
    refetchInterval: 5000,
  });

  if (isPending) {
    return <Spinner animation="border" className="m-4" />;
  }

  return data?.map((fleet: components["schemas"]["FleetDetails"]) => (
    <Card key={fleet.eve_fleet_id} style={{ width: "24rem" }} className="m-4">
      <Card.Img
        variant="top"
        src={`https://images.evetech.net/characters/${fleet.boss.character_id}/portrait?size=256`}
        alt={fleet.boss.character_name}
      />
      <Card.Body>
        <Card.Title>{fleet?.name}</Card.Title>
        <hr />
        <LinkContainer to={`/cat/active/${fleet.eve_fleet_id}/`}>
          <Button variant="primary" className="w-100">
            View Fleet
          </Button>
        </LinkContainer>
        <CloseFleetButton fleet_id={fleet.eve_fleet_id} />
      </Card.Body>
      <Card.Footer className="text-muted">{fleet.last_update}</Card.Footer>
    </Card>
  ));
};

export default ActiveFleetList;
