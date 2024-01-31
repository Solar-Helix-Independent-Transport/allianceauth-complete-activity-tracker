import ActiveFleetList from "../components/ActiveFleetList";
import TrackFleetSearch from "../components/TrackFleetSearch";
import { Col } from "react-bootstrap";

const FleetSelect = () => {
  return (
    <>
      <Col>
        <h1>Fleets</h1>
        <div className="d-flex justify-content-center align-items-center flex-row flex-wrap">
          <TrackFleetSearch />
          <ActiveFleetList />
        </div>
      </Col>
    </>
  );
};

export default FleetSelect;
