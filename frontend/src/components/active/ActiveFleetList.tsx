import { components } from "../../api/CatApi";
import { getActiveFleetList } from "../../api/Methods";
import CloseFleetButton from "../buttons/CloseFleet";
import { useQuery } from "@tanstack/react-query";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Table from "react-bootstrap/Table";
import { LinkContainer } from "react-router-bootstrap";

type Fleet = components["schemas"]["FleetDetails"];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

const ActiveFleetList = () => {
  const { data, isPending } = useQuery({
    queryKey: ["getActiveFleetList"],
    queryFn: async () => await getActiveFleetList(),
    refetchInterval: 5000,
  });

  if (isPending) return <Spinner animation="border" className="m-3" />;
  if (!data?.length) return <p className="text-muted m-3">No active fleets.</p>;

  return (
    <Table striped hover className="mb-0 align-middle">
      <thead>
        <tr>
          <th>Fleet</th>
          <th>FC</th>
          <th>Started</th>
          <th>Last Update</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {data.map((fleet: Fleet) => (
          <tr key={fleet.eve_fleet_id}>
            <td>{fleet.name}</td>
            <td>
              <div className="d-flex align-items-center gap-2">
                <img
                  src={`https://images.evetech.net/characters/${fleet.boss.character_id}/portrait?size=32`}
                  alt={fleet.boss.character_name}
                  width={32}
                  height={32}
                />
                <span>{fleet.boss.character_name}</span>
              </div>
            </td>
            <td>{formatDate(fleet.start_time)}</td>
            <td>{formatDate(fleet.last_update)}</td>
            <td>
              <div className="d-flex gap-2">
                <LinkContainer to={`/cat/active/${fleet.eve_fleet_id}/`}>
                  <Button variant="primary" size="sm">View</Button>
                </LinkContainer>
                <CloseFleetButton fleet_id={fleet.eve_fleet_id} size="sm" />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default ActiveFleetList;
