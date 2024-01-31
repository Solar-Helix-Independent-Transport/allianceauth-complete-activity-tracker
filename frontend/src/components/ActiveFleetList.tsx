import CloseFleetButton from "./CloseFleet";
import { useQuery } from "@tanstack/react-query";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";

const getActiveFleetList = async () => {
  console.log("getActiveFleetList");
  const response = fetch(`cat/api/fleets/active`, {}).then(async (res) => await res.json());
  console.log(response);
  return response;
};

const ActiveFleetList = () => {
  const { data } = useQuery({
    queryKey: ["getActiveFleetList"],
    queryFn: async () => await getActiveFleetList(),
    refetchInterval: 5000,
  });

  console.log(data);
  return data?.map((fleet: unknown) => {
    return (
      <Card style={{ width: "24rem" }} className="m-4">
        <Card.Img
          variant="top"
          src={`https://images.evetech.net/characters/${fleet.boss__character_id}/portrait?size=256`}
        />
        <Card.Body>
          <Card.Title>{fleet.name}</Card.Title>
          <hr />
          <Button variant="primary" className="w-100">
            View Fleet {fleet.eve_fleet_id}
          </Button>
          <CloseFleetButton fleet_id={fleet.eve_fleet_id} />
        </Card.Body>
        <Card.Footer className="text-muted">{fleet.last_update}</Card.Footer>
      </Card>
    );
  });
};

export default ActiveFleetList;
