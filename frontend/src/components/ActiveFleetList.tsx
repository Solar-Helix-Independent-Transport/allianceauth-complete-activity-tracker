import { getCatApi } from "../api/Api";
import { components } from "../api/CatApi";
import CloseFleetButton from "./buttons/CloseFleet";
import { useQuery } from "@tanstack/react-query";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { LinkContainer } from "react-router-bootstrap";

async function getActiveFleetList() {
  const { GET } = getCatApi();

  const { data, error } = await GET("/cat/api/fleets/active/");
  if (error) {
    console.log(error);
  } else {
    console.log(data);
    return data;
  }
}

const ActiveFleetList = () => {
  const { data } = useQuery({
    queryKey: ["getActiveFleetList"],
    queryFn: async () => await getActiveFleetList(),
    refetchInterval: 5000,
  });

  console.log(data);
  return data?.map((fleet: components["schemas"]["FleetDetails"]) => {
    return (
      <Card style={{ width: "24rem" }} className="m-4">
        <Card.Img
          variant="top"
          src={`https://images.evetech.net/characters/${fleet.boss.character_id}/portrait?size=256`}
        />
        <Card.Body>
          <Card.Title>{fleet?.name}</Card.Title>
          <hr />
          <LinkContainer to={`/cat/${fleet.eve_fleet_id}/`}>
            <Button variant="primary" className="w-100">
              View Fleet {fleet.eve_fleet_id}
            </Button>
          </LinkContainer>
          <CloseFleetButton fleet_id={fleet.eve_fleet_id} />
        </Card.Body>
        <Card.Footer className="text-muted">{fleet.last_update}</Card.Footer>
      </Card>
    );
  });
};

export default ActiveFleetList;
