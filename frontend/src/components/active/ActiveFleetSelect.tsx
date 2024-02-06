import ActiveFleetList from "./ActiveFleetList";
import TrackFleetSearch from "./TrackFleetSearch";
import { Col } from "react-bootstrap";

const ActiveFleetSelect = () => {
  return (
    <>
      <Col>
        <div className="d-flex justify-content-center align-items-center flex-row flex-wrap">
          <TrackFleetSearch />
          <ActiveFleetList />
        </div>
      </Col>
    </>
  );
};

export default ActiveFleetSelect;
