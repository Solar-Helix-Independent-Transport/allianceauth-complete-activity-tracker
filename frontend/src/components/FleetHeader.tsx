import { components } from "../api/CatApi";
import Card from "react-bootstrap/esm/Card";

const FleetHeader = ({ fleet }: { fleet: components["schemas"]["FleetDetails"] }) => {
  return (
    <Card>
      <div className="d-flex">
        <h4 className="me-auto">{fleet.name}</h4>
        <div>
          <a className="btn btn-default btn-sm" href="/cat/char/add">
            <i className="fas fa-plus fa-fw"></i>
          </a>
        </div>
      </div>
    </Card>
  );
};

export default FleetHeader;
