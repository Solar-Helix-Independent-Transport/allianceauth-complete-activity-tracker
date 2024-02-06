import { components } from "../../api/CatApi";
import { getRecentFleetList } from "../../api/Methods";
import LabelDiv from "../LabelDiv";
import { useQuery } from "@tanstack/react-query";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { LinkContainer } from "react-router-bootstrap";

const RecentFleetList = () => {
  const { data } = useQuery({
    queryKey: ["getRecentFleetList"],
    queryFn: async () => await getRecentFleetList(),
    refetchInterval: 5000,
  });

  console.log(data);
  return data?.map((fleet: components["schemas"]["FleetDetails"]) => {
    return (
      <Card style={{ width: "24rem" }} className="m-4">
        <Card.Body>
          <Card.Title>{fleet?.name}</Card.Title>
          <hr />
          <Card.Text>
            <LabelDiv label={"Start Time"} value={fleet.start_time} />
            <LabelDiv label={"End Time"} value={fleet.end_time} />
          </Card.Text>
          <LinkContainer to={`/cat/recent/${fleet.eve_fleet_id}/`}>
            <Button variant="primary" className="w-100">
              View Fleet
            </Button>
          </LinkContainer>
        </Card.Body>
      </Card>
    );
  });
};

export default RecentFleetList;
