import { Cat } from "../api/Cat";
import CloseFleetButton from "./buttons/CloseFleet";
import { useQuery } from "@tanstack/react-query";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { LinkContainer } from "react-router-bootstrap";

declare interface FleetProps {
  name: string;
  eve_fleet_id: number;
  boss__character_id: number;
  last_update: string;
}

const getActiveFleetList = async () => {
  console.log("getActiveFleetList");
  const api = new Cat();

  const response = await api.aacatApiGetFleetsActive();
  console.log(response);
  return response.data;
};

const ActiveFleetList = () => {
  const { data } = useQuery({
    queryKey: ["getActiveFleetList"],
    queryFn: async () => await getActiveFleetList(),
    refetchInterval: 5000,
  });

  console.log(data);
  return data?.map((fleet: FleetProps) => {
    return (
      <Card style={{ width: "24rem" }} className="m-4">
        <Card.Img
          variant="top"
          src={`https://images.evetech.net/characters/${fleet.boss__character_id}/portrait?size=256`}
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
